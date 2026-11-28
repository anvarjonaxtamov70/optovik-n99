// Isolated SQLite architecture prototype. No Firebase or cloud access.
// Node's built-in SQLite only; never import this in the Expo bundle or Worker.
import { DatabaseSync, backup } from 'node:sqlite';
import { createOrder, transition } from '../staging-worker.mjs';

const json=JSON.stringify, parse=JSON.parse;
const own=(v,k)=>v!==null&&typeof v==='object'&&Object.hasOwn(v,k)?v[k]:undefined;
const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const safeKey=v=>typeof v==='string'&&v.length>0&&v.length<=100&&!/[.#$\[\]/\x00-\x1f\x7f]/.test(v)&&!['__proto__','constructor','prototype'].includes(v);
function reject(code){throw Object.assign(new Error(code),{status:400});}
function key(v){if(!safeKey(v))reject('invalid-key');return v;}
function map(){return Object.create(null);}
function setProduct(root,cat,id,p){if(!own(root.tovarlar,cat))root.tovarlar[cat]=map();root.tovarlar[cat][id]=p;}

export class TransactionPrototype {
  #db;
  constructor({filename=':memory:'}={}) {
    // Only local synthetic databases are supported. Never point at business data.
    this.#db=new DatabaseSync(filename);
    this.#db.exec(`
      PRAGMA busy_timeout=5000;
      PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS products(cat TEXT NOT NULL, id TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(cat,id));
      CREATE TABLE IF NOT EXISTS customers(uid TEXT PRIMARY KEY, last_order INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS admins(uid TEXT PRIMARY KEY);
      CREATE TABLE IF NOT EXISTS settings(id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY, uid TEXT NOT NULL, payload TEXT NOT NULL, idx TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS orders_by_uid ON orders(uid);
      CREATE TABLE IF NOT EXISTS outbox(seq INTEGER PRIMARY KEY AUTOINCREMENT, order_id TEXT NOT NULL, kind TEXT NOT NULL, snapshot TEXT NOT NULL, FOREIGN KEY(order_id) REFERENCES orders(id));
    `);
  }
  close(){this.#db.close();}
  async backupTo(filename){await backup(this.#db,filename);}
  eventsAfter(seq=0,limit=100){
    if(!Number.isSafeInteger(seq)||seq<0||!Number.isInteger(limit)||limit<1||limit>100)reject('invalid-cursor');
    return this.#db.prepare('SELECT seq,order_id,kind,snapshot FROM outbox WHERE seq>? ORDER BY seq LIMIT ?').all(seq,limit).map(row=>({seq:row.seq,orderId:row.order_id,kind:row.kind,index:parse(row.snapshot)}));
  }
  // Snapshot at commit time, not the mutable current order state.
  #event(id,kind,index){
    this.#db.prepare('INSERT INTO outbox(order_id,kind,snapshot) VALUES(?,?,?)').run(id,kind,json(index));
  }
  seedProduct(cat,id,p){this.#db.prepare('INSERT INTO products VALUES(?,?,?)').run(key(cat),key(id),json(p));}
  seedSettings(settings){this.#db.prepare('INSERT INTO settings VALUES(1,?)').run(json(settings));}
  seedAdmin(uid){this.#db.prepare('INSERT INTO admins VALUES(?)').run(key(uid));}
  #atomic(task){
    this.#db.exec('BEGIN IMMEDIATE');
    try{const result=task();this.#db.exec('COMMIT');return result;}
    catch(error){this.#db.exec('ROLLBACK');throw error;}
  }
  #root(uid,id){
    key(uid);key(id);
    const root={tovarlar:map(),orders:map(),orderIndex:map(),customers:map(),admins:map()};
    const row=this.#db.prepare('SELECT uid,payload,idx FROM orders WHERE id=?').get(id);
    if(row){
      root.orderIndex[id]=parse(row.idx);
      if(row.uid===uid){root.orders[uid]=map();root.orders[uid][id]=parse(row.payload);}
    }
    return root;
  }
  #products(root,items){
    if(!record(items))reject('invalid-cart');
    let count=0;
    for(const [cat,group] of Object.entries(items)){
      key(cat);if(!record(group)||!Object.keys(group).length)reject('invalid-cart');
      for(const id of Object.keys(group)){
        key(id);if(++count>50)reject('invalid-cart');
        const row=this.#db.prepare('SELECT payload FROM products WHERE cat=? AND id=?').get(cat,id);
        if(row)setProduct(root,cat,id,parse(row.payload));
      }
    }
  }
  create(uid,b,now){
    return this.#atomic(()=>{
      const id=key(b?.id),root=this.#root(uid,id);
      // Replay lookup is bounded even if catalog contents have since changed.
      if(!own(own(root.orders,uid),id)){
        const last=this.#db.prepare('SELECT last_order FROM customers WHERE uid=?').get(uid);
        if(last)root.customers[uid]={lastOrderAt:last.last_order};
        const shop=this.#db.prepare('SELECT payload FROM settings WHERE id=1').get();
        if(shop)root.settings={shop:parse(shop.payload)};
        this.#products(root,b?.order?.items);
      }
      const result=createOrder(root,uid,b,now);
      if(result.changed){
        this.#db.prepare('INSERT INTO orders VALUES(?,?,?,?)').run(id,uid,json(root.orders[uid][id]),json(root.orderIndex[id]));
        this.#db.prepare('INSERT INTO customers VALUES(?,?) ON CONFLICT(uid) DO UPDATE SET last_order=excluded.last_order').run(uid,root.customers[uid].lastOrderAt);
        this.#event(id,'created',root.orderIndex[id]);
      }
      return result.value;
    });
  }
  change(actor,b,now){
    return this.#atomic(()=>{
      key(actor);const uid=key(b?.uid),id=key(b?.id),root=this.#root(uid,id);
      if(this.#db.prepare('SELECT 1 FROM admins WHERE uid=?').get(actor))root.admins[actor]=true;
      const order=own(own(root.orders,uid),id);
      const touchesInventory=b.next==='tasdiqlandi'||(b.next==='bekor'&&order?.zaxira===true);
      if(touchesInventory&&order)this.#products(root,order.items);
      const result=transition(root,actor,b,now);
      if(result.changed){
        for(const [cat,group] of Object.entries(root.tovarlar))for(const [pid,p] of Object.entries(group)){
          this.#db.prepare('UPDATE products SET payload=? WHERE cat=? AND id=?').run(json(p),cat,pid);
        }
        this.#db.prepare('UPDATE orders SET payload=?,idx=? WHERE id=? AND uid=?').run(json(root.orders[uid][id]),json(root.orderIndex[id]),id,uid);
        this.#event(id,b.next,root.orderIndex[id]);
      }
      return result.value;
    });
  }
  product(cat,id){const row=this.#db.prepare('SELECT payload FROM products WHERE cat=? AND id=?').get(cat,id);return row?parse(row.payload):null;}
  order(id){const row=this.#db.prepare('SELECT payload FROM orders WHERE id=?').get(id);return row?parse(row.payload):null;}
  counts(){return {orders:this.#db.prepare('SELECT count(*) AS n FROM orders').get().n,events:this.#db.prepare('SELECT count(*) AS n FROM outbox').get().n};}
}
