// Local synthetic worker-thread fixture, not a server or network client.
import { parentPort, workerData } from 'node:worker_threads';
import { TransactionPrototype } from '../../backend/prototype/transaction-store.mjs';
const {filename,operation,args}=workerData;
let db;
try {
  if(!['create','change'].includes(operation))throw new Error('Invalid test operation');
  db=new TransactionPrototype({filename});
  parentPort.postMessage({ready:true});
  parentPort.once('message',message=>{
    let result;
    try{
      if(message!=='start')throw new Error('Invalid test signal');
      result={ok:true,value:db[operation](...args)};
    }catch(error){result={ok:false,status:error.status??null,code:error.message};}
    finally{db.close();parentPort.postMessage({result});parentPort.close();}
  });
}catch(error){
  db?.close();
  parentPort.postMessage({failure:error.message});
  parentPort.close();
}
