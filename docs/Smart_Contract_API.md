# Smart Contract API

## 重要参数解释

**OrderComponents参数解释：**

一个订单业务上由两部分内容组成：

1. 要给出的资产项
2. 想要获得的资产项

可以将Order理解为一个以物换物的订单。

|参数名|解释|
|---|---|
|offerer|订单提供者|
|OfferItem|订单中提供的资产数据|
|ConsiderationItem|订单提供者想要获得的资产数据|
|startTime|订单的开始时间|
|endTime|订单的结束时间|
|salt|随机值，每个订单的salt都不同|
|signature|订单提供者为此订单授予的签名|
|counter|计数器，所有订单的counter默认都是0|
    
**OfferItem参数解释：**

订单中提供的资产

|参数名|解释|
|---|---|
|itemType|item类型枚举|
|token|资产的合约地址(ERC20或者ERC721)|
|identifierOrCriteria|如果资产是ERC20，那么这个参数值就为0；如果是NFT，那么这个参数是tokenID|
|startAmount|代币数量|
|endAmount|当前版本与startAmount相同，留作后期打开荷兰拍的时候用|

**ConsiderationItem参数解释：**

订单中寻求获得的资产

|参数名|解释|
|---|---|
|itemType|item类型枚举|
|token|资产的合约地址(ERC20或者ERC721)|
|identifierOrCriteria|如果资产是ERC20，那么这个参数值就为0；如果是NFT，那么这个参数是tokenID|
|startAmount|代币数量|
|endAmount|当前版本与startAmount相同，留作后期打开荷兰拍的时候用|
|recipient|资产接收者地址|

**ItemType解释：**

|参数名|解释|
|---|---|
|NATIVE|ETH 原生代币，值为0|
|ERC20|值为1|
|ERC721|值为2|
|ERC1155|值为3|

## 取消List & 取消Offer

取消List和取消Offer使用的是同一个函数，因为List和Offer使用的是同一个数据结构，都可以抽象为一个订单。

### 限制

只有订单的提供者才可以取消。

### 函数名

```
cancel(OrderComponents[] calldata orders)external
```

### 参数

|参数名|解释|
|---|---|
|orders|要取消的订单数组|

## Accept an offer & Buy an NFT with fixed price

接受offer和一口价买入NFT，都是促成交易成交的行为，都是使用`fulfillOrder`方法进行的。

传入的参数类型`OrderParameters`与`OrderComponents`类似，就是少了`counter`字段，其余都一样。
