import type {Order,OrderIndex} from './order';

export type AdminFeed={actor:string|null;orders:OrderIndex[];limit:number;loading:boolean;error:boolean};
// Match existing consumer bounds: watcher 20, dashboard/sidebar 300, list 500.
export function adminFeedLimit(pathname:string,sidebar:boolean):number{
 if(/^\/admin\/orders\/?$/.test(pathname))return 500;
 if(sidebar||/^\/admin\/?$/.test(pathname))return 300;
 return 20;
}
export function selectAdminFeed(feed:AdminFeed,actor:string|null,limit:number){
 if(!actor||feed.actor!==actor)return {orders:[],loading:!!actor,error:false};
 // If fewer rows than requested were returned, that snapshot covered the whole
 // list. Otherwise show the known prefix while a larger request is in flight.
 const incomplete=feed.orders.length>=feed.limit&&feed.limit<limit;
 return {orders:feed.orders.slice(0,limit),loading:feed.loading||(!feed.error&&incomplete),error:feed.error};
}
export function patchAdminFeed(feed:AdminFeed,actor:string,order:Order):AdminFeed{
 if(feed.actor!==actor)return feed;
 return {...feed,orders:feed.orders.map(o=>o.id===order.id&&o.uid===order.uid?{...o,holat:order.holat}:o)};
}
