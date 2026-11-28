// Keep internal staff notes out of customer payloads on every candidate order route.
export function customerOrderView(order){
 const {adminIzoh:_internalNote,...visible}=order;
 return visible;
}
