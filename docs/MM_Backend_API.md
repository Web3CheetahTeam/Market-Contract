# MM Backend API

**URL**            https://test-backend.hotluuu.io/mm/  
**HEADER**    _Content-Type:application/json_  
_Will add MUTUAL TLS authentication after API confirmed, will give a code example later_

**get inventories**  
```json lines
{
  "jsonrpc":"2.0",
  "method":"getInventories",
  "params":["0xBccc2073adfc46421308f62cfd9868df00d339a8", // user’s address
    {"rarity":["Rare"]} // attributes filter, support filter in multiple values for each key 
  ]}
```
```json lines
// test data has some empty field, will be solved later
{
  "jsonrpc": "2.0",
  "result": [
    {
      "contract_address": "0x93b38db5c4652a23770f2979b0be03035b8317e2", // contract address of this token
      "token_id": 1, // id of this token
      "name": "", // name of this token
      "description": "",
      "image": "",
      "attributes": {
        "rarity":"Rare"
      } // attributes of this token, its datatype is a map ([key]:[value])
    }
  ],
  "id": 0
}
```

**get floor price**  
`params` collection address
```json lines
{"jsonrpc":"2.0","method":"getFloorPrice","id":1,"params":["0x93b38db5c4652a23770f2979b0be03035b8317e2"]}
```
```json lines
{
  "jsonrpc":"2.0",
  "result":2176.4897747279997, // unit: ETH,USDT,WTH...
  "id":1
}
```

**list listings**  
`params` NO
```json lines
{"jsonrpc":"2.0","method":"listListings","id":1}
```
```json lines
{
  "jsonrpc":"2.0",
  "result":[
    {
      "contract_address":"0x93b38db5c4652a23770f2979b0be03035b8317e2",
      "token_id":3,
      "price_address":"0x0000000000000000000000000000000000000000", // which currency should buyer pay. currency erc20 contract address,(0x00...represents ETH)
      "price_amount":1.2 // unit: ETH,USDT,WTH...
    }
  ],
  "id":1
}
```
**make listing**
`params`  listing information
```json lines
{
  "jsonrpc": "2.0",
  "method": "listing",
  "id": 0,
  "params": [
    {
      // This is a unique random number, which will be used in the contract call. So that the backend service will match this blockchain event
      // Should transfer this decimal number to hex and add "0xa" as a prefix if it presents a listing, or "0xb" if it presents a offer.
      // So that the backend service is easy to recognize this two different type orders.
      "salt": "0xa6401e672fb40dae886cb4f5f952e0b61",
      "contract_address": "0x93b38db5c4652a23770f2979b0be03035b8317e2", // which nft will be sold,token collecion
      "token_id": 3, // which nft will be sold,token id
      "price_address": "0x0000000000000000000000000000000000000000", // which currency should buyer pay. currency erc20 contract address,(0x00...represents ETH)
      "price_amount": 1.2, // how many FT tokens should pay,  unit: ETH,USDT,WTH...
      "deadline": 1684380073, // the deadline time of this listing, unit: second
      "creator": "0xBf3Aabb78e96c18a425C39D82C2B6505aA86940F", // whom create this listing
      "signature": "0xe36761ddfa1db9bdd1366e7992f5e24143490b220ccfd99f4abb71b2edd8beef0c5473a52e6ff479aa1ad232b2635d89d42c676ba110c46558865fa48b5f8bd11b" // this should be used in contract call
    }
  ]
}
```
```json lines
{
  "jsonrpc":"2.0",
  "result":"63fca8ea-3233-4d5b-8d62-adf7e2a147e1", // listing id
  "id":0
}
```
**salt JS example**
```javascript
// 1. get a random number
export const getSalt = (timestamp: number) => {
    return BigNumbers.from(
    BigNumbers.from(timestamp).toHexString() + "xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    }));  
}
// 2. and "0xa" if it's a listing order
console.log("0xa" + getSalt)
// 3. and "0xb" if it's a offer order
console.log("0xb" + getSalt)
```
**cancel listing**
`params` listing id
```json lines
{"jsonrpc":"2.0","method":"cancelListing","id":0,"params":["63fca8ea-3233-4d5b-8d62-adf7e2a147e1"]}
```
```json lines
{
  "jsonrpc":"2.0",
  "result":"63fca8ea-3233-4d5b-8d62-adf7e2a147e1", // listing id
  "id":0
}
```
**list offers**  
`params` nft token’s colleciont address and id
```json lines
{"jsonrpc":"2.0","method":"listOffers","id":1,"params":["0x93b38db5c4652a23770f2979b0be03035b8317e2",3]}
```
```json lines
{
  "jsonrpc": "2.0",
  "result": [
    {
      "price_amount": 1.2, // as above
      "price_currency": "0x0000000000000000000000000000000000000000", // as above
      "USPrice": 2170.603507728, // us dollar value as 'price_amount'
      "creator": "0xBf3Aabb78e96c18a425C39D82C2B6505aA86940F", // as above
      "deadline": 1684380073, // as above
      "offer_id": "2d656900-8e64-4bfb-b74f-34316caa87c8",
      "signature": "0xe36761ddfa1db9bdd1366e7992f5e24143490b220ccfd99f4abb71b2edd8beef0c5473a52e6ff479aa1ad232b2635d89d42c676ba110c46558865fa48b5f8bd11b", // as above
      "salt": "0xb6401e672fb40dae886cb4f5f952e0b61" // as above, but should add "0xb" as prefix
    }
  ],
  "id": 1
}
```
**make offer**
```json lines
{
  "jsonrpc": "2.0",
  "method": "offer",
  "id": 1,
  "params": [
    {
      "salt": "0xb6401e672fb40dae886cb4f5f952e0b61", // as above
      "contract_address": "0x93b38db5c4652a23770f2979b0be03035b8317e2", // as above
      "token_id": 3, // as above
      "price_address": "0x0000000000000000000000000000000000000000", // as above
      "price_amount": 1.2, // as above
      "price_wei": "120000000000000000", // wei value as 'price_amount'. different erc20 may has different precision. like usdt: 6 which is different with most others (18)
      "deadline": 1684380073, // as above
      "creator": "0xBf3Aabb78e96c18a425C39D82C2B6505aA86940F", // as above
      "signature": "0xe36761ddfa1db9bdd1366e7992f5e24143490b220ccfd99f4abb71b2edd8beef0c5473a52e6ff479aa1ad232b2635d89d42c676ba110c46558865fa48b5f8bd11b" // as above
    }
  ]
}
```
```json lines
{"jsonrpc":"2.0","result":"2d656900-8e64-4bfb-b74f-34316caa87c8","id":1}
```
**cancel offer**
`params` offer id
```json lines
{"jsonrpc":"2.0","method":"cancelOffer","id":1,"params":["2d656900-8e64-4bfb-b74f-34316caa87c8"]}
```
```json lines
{
  "jsonrpc":"2.0",
  "result":"2d656900-8e64-4bfb-b74f-34316caa87c8", // offer id
  "id":1
}
```