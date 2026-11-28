// Local order-index projection experiment. No network or customer data access.
export class OrderIndexProjection {
  #rows=new Map();
  apply(event){
    if(!event||!Number.isSafeInteger(event.seq)||event.seq<1||typeof event.orderId!=='string'||!event.index||typeof event.index!=='object'||Array.isArray(event.index))throw new Error('Invalid event');
    const old=this.#rows.get(event.orderId);
    if(old&&old.seq>=event.seq)return false;
    this.#rows.set(event.orderId,{seq:event.seq,index:structuredClone(event.index)});
    return true;
  }
  get(id){const row=this.#rows.get(id);return row?structuredClone(row.index):null;}
}
