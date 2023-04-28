// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "contracts/lib/Struct.sol";
import "contracts/lib/Enum.sol";

// import "hardhat/console.sol";

contract Market is
    OwnableUpgradeable,
    EIP712Upgradeable,
    OrderParameterBase,
    ReentrancyGuardUpgradeable
{
    struct OrderStatus {
        bool isValidated;
        bool isCancelled;
    }

    // 100 / 10000
    struct CollectionFee {
        uint64 marketFee;
        uint64 projectFee;
        uint64 ipFee;
    }

    address public marketVault;
    address public projectVault;
    address public ipVault;
    // collection address => fees
    mapping(address => CollectionFee) public fees;

    mapping(address => bool) public whitelist; // Users in the whitelist can enjoy free transaction fee

    // offerer => counter
    mapping(address => uint256) public counters;
    // order hash => status
    mapping(bytes32 => OrderStatus) public orderStatus;

    // collection permission
    mapping(address => bool) public collections;

    event OrderCancelled(address indexed canceller, uint256 indexed salt);
    event Sold(
        bytes32 indexed orderHash,
        uint256 indexed salt,
        uint256 indexed time,
        address from,
        address to
    );
    event SetWhiteList(address[] users, bool[] permissions);
    event SetCollection(address collection, bool permission);
    event SetCollectionFee(
        address collection,
        uint64 marketFee,
        uint64 projectFee,
        uint64 ipFee
    );
    event CounterIncremented(uint256 indexed counter, address indexed user);

    error OrderTypeError(ItemType offerType, ItemType considerationType);
    error InvalidCanceller();

    function initialize(
        string memory name,
        string memory version
    ) public initializer {
        __Ownable_init();
        __EIP712_init(name, version);
    }

    function _verify(
        bytes32 orderHash,
        bytes calldata signature
    ) internal view returns (address) {
        bytes32 digest = _hashTypedDataV4(orderHash);
        address signer = ECDSAUpgradeable.recover(digest, signature);
        return (signer);
    }

    function fulfillOrder(
        OrderParameters calldata order
    ) external payable nonReentrant returns (bool fulfilled) {
        address from;
        address to;
        // calculate order hash
        bytes32 orderHash = _deriveOrderHash(order, counters[order.offerer]);

        /* 
        Validate
            - 确保当前时间在订单有效时间内
            - 是否已经被取消
            - 是否已经被购买
            - 验证签名&参数
            - 验证 tx.value
            - 重放攻击
         */
        require(
            block.timestamp >= order.startTime &&
                block.timestamp <= order.endTime,
            "Time error"
        );

        OrderStatus storage _orderStatus = orderStatus[orderHash];
        require(
            !_orderStatus.isCancelled && !_orderStatus.isValidated,
            "Status error"
        );

        // verify signature
        require(
            _verify(orderHash, order.signature) == order.offerer,
            "Sign error"
        );

        /* 
            - 转移 Fee
         */
        // fee
        uint256 _marketFee;
        uint256 _projectFee;
        uint256 _ipFee;
        uint256 _totalFee;
        ConsiderationItem memory consideration = order.consideration[0];
        OfferItem memory offerItem = order.offer[0];
        if (!whitelist[msg.sender]) {
            // consideration
            if (
                consideration.itemType == ItemType.NATIVE ||
                consideration.itemType == ItemType.ERC20
            ) {
                // offer必须是NFT
                if (
                    offerItem.itemType == ItemType.NATIVE ||
                    offerItem.itemType == ItemType.ERC20
                ) {
                    revert OrderTypeError(
                        offerItem.itemType,
                        consideration.itemType
                    );
                } else {
                    require(
                        collections[offerItem.token],
                        "ERROR: This collection has no permission"
                    );
                }
                from = order.offerer;
                to = msg.sender;

                _marketFee =
                    (consideration.startAmount *
                        fees[offerItem.token].marketFee) /
                    10000;
                _projectFee =
                    (consideration.startAmount *
                        fees[offerItem.token].projectFee) /
                    10000;
                _ipFee =
                    (consideration.startAmount * fees[offerItem.token].ipFee) /
                    10000;
                _totalFee = _marketFee + _projectFee + _ipFee;

                if (consideration.itemType == ItemType.NATIVE) {
                    require(
                        msg.value >= consideration.startAmount,
                        "TX value error"
                    );
                    payable(marketVault).transfer(_marketFee);
                    payable(projectVault).transfer(_projectFee);
                    payable(ipVault).transfer(_ipFee);
                } else {
                    require(
                        IERC20Upgradeable(consideration.token).transferFrom(
                            msg.sender,
                            marketVault,
                            _marketFee
                        ),
                        "ERC20 market fee error"
                    );
                    require(
                        IERC20Upgradeable(consideration.token).transferFrom(
                            msg.sender,
                            projectVault,
                            _projectFee
                        ),
                        "ERC20 project fee error"
                    );
                    require(
                        IERC20Upgradeable(consideration.token).transferFrom(
                            msg.sender,
                            ipVault,
                            _ipFee
                        ),
                        "ERC20 ip fee error"
                    );
                }
            } else if (
                // offer
                offerItem.itemType == ItemType.NATIVE ||
                offerItem.itemType == ItemType.ERC20
            ) {
                require(
                    collections[consideration.token],
                    "ERROR: This collection has no permission"
                );
                // or
                // if (
                //     consideration.itemType == ItemType.NATIVE ||
                //     consideration.itemType == ItemType.ERC20
                // ) {
                //     revert OrderTypeError(
                //         offerItem.itemType,
                //         consideration.itemType
                //     );
                // }
                _marketFee =
                    (offerItem.startAmount *
                        fees[consideration.token].marketFee) /
                    10000;
                _projectFee =
                    (offerItem.startAmount *
                        fees[consideration.token].projectFee) /
                    10000;
                _ipFee =
                    (offerItem.startAmount * fees[consideration.token].ipFee) /
                    10000;
                _totalFee = _marketFee + _projectFee + _ipFee;

                from = msg.sender;
                to = order.offerer;

                if (offerItem.itemType == ItemType.NATIVE) {
                    // ETH can't approve
                    revert OrderTypeError(
                        offerItem.itemType,
                        consideration.itemType
                    );
                } else {
                    require(
                        IERC20Upgradeable(offerItem.token).transferFrom(
                            order.offerer,
                            marketVault,
                            _marketFee
                        ),
                        "ERC20 market fee error"
                    );
                    require(
                        IERC20Upgradeable(offerItem.token).transferFrom(
                            order.offerer,
                            projectVault,
                            _projectFee
                        ),
                        "ERC20 project fee error"
                    );
                    require(
                        IERC20Upgradeable(offerItem.token).transferFrom(
                            order.offerer,
                            ipVault,
                            _ipFee
                        ),
                        "ERC20 ip fee error"
                    );
                }
            } else {
                // error 必须要有一个是Token，不支持NFT换NFT
                revert OrderTypeError(
                    offerItem.itemType,
                    consideration.itemType
                );
            }
        }

        /* 
            - 转移 Consideration
        */
        if (consideration.itemType == ItemType.NATIVE) {
            payable(consideration.recipient).transfer(
                consideration.startAmount - _totalFee
            );
        } else if (consideration.itemType == ItemType.ERC20) {
            require(
                IERC20Upgradeable(consideration.token).transferFrom(
                    msg.sender,
                    consideration.recipient,
                    consideration.startAmount - _totalFee
                ),
                "Transfer erc20 consideration error"
            );
        } else if (consideration.itemType == ItemType.ERC721) {
            IERC721Upgradeable(consideration.token).safeTransferFrom(
                msg.sender,
                consideration.recipient,
                consideration.identifierOrCriteria
            );
        } else if (consideration.itemType == ItemType.ERC1155) {
            IERC1155Upgradeable(consideration.token).safeTransferFrom(
                msg.sender,
                consideration.recipient,
                consideration.identifierOrCriteria,
                consideration.startAmount,
                "0x0"
            );
        }

        /* 
            - 转移 Offer 
         */
        if (offerItem.itemType == ItemType.ERC20) {
            require(
                IERC20Upgradeable(offerItem.token).transferFrom(
                    order.offerer,
                    msg.sender,
                    offerItem.startAmount - _totalFee
                ),
                "Transfer erc20 offer error"
            );
        } else if (offerItem.itemType == ItemType.ERC721) {
            IERC721Upgradeable(offerItem.token).safeTransferFrom(
                order.offerer,
                msg.sender,
                offerItem.identifierOrCriteria
            );
        } else if (offerItem.itemType == ItemType.ERC1155) {
            IERC1155Upgradeable(offerItem.token).safeTransferFrom(
                order.offerer,
                msg.sender,
                offerItem.identifierOrCriteria,
                offerItem.startAmount,
                "0x0"
            );
        }

        /* 
            - 更改关键状态
         */
        _orderStatus.isValidated = true;

        // 增加 from to
        emit Sold(orderHash, order.salt, block.timestamp, from, to);
    }

    //  取消一组订单
    function cancel(OrderComponents[] calldata orders) external {
        OrderStatus storage _orderStatus;
        address offerer;

        for (uint256 i = 0; i < orders.length; ) {
            // Retrieve the order.
            OrderComponents calldata order = orders[i];

            offerer = order.offerer;

            // Ensure caller is either offerer or zone of the order.
            if (msg.sender != offerer) {
                revert InvalidCanceller();
            }

            // Derive order hash using the order parameters and the counter.
            bytes32 orderHash = _deriveOrderHash(
                OrderParameters(
                    offerer,
                    order.offer,
                    order.consideration,
                    order.startTime,
                    order.endTime,
                    order.salt,
                    order.signature
                ),
                order.counter
            );

            // Retrieve the order status using the derived order hash.
            _orderStatus = orderStatus[orderHash];

            // Update the order status as not valid and cancelled.
            _orderStatus.isValidated = false;
            _orderStatus.isCancelled = true;

            // Emit an event signifying that the order has been cancelled.
            emit OrderCancelled(offerer, order.salt);

            // Increment counter inside body of loop for gas efficiency.
            ++i;
        }
    }

    // 增加计数器，取消所有的订单
    // function incrementCounter() external {
    //     counters[msg.sender]++;
    //     emit CounterIncremented(counters[msg.sender], msg.sender);
    // }

    // 配置collection
    function setCollection(
        address collection,
        bool permission
    ) public onlyOwner {
        collections[collection] = permission;
        emit SetCollection(collection, permission);
    }

    // 配置零Fee白名单
    function setWhiteList(
        address[] calldata users,
        bool[] calldata permissions
    ) public onlyOwner {
        for (uint256 i; i < users.length; i++) {
            whitelist[users[i]] = permissions[i];
        }
        emit SetWhiteList(users, permissions);
    }

    // 配置fee
    function setFees(
        address collectionAddress,
        CollectionFee calldata fees_
    ) public onlyOwner {
        require(
            marketVault != address(0) &&
                projectVault != address(0) &&
                ipVault != address(0),
            "ERROR: vault is empty"
        );
        require(
            fees_.marketFee + fees_.projectFee + fees_.ipFee < 10000,
            "exceed max fee"
        );
        fees[collectionAddress] = fees_;
        emit SetCollectionFee(
            collectionAddress,
            fees_.marketFee,
            fees_.projectFee,
            fees_.ipFee
        );
        if (!collections[collectionAddress]) {
            collections[collectionAddress] = true;
        }
    }

    function setVaults(
        address marketVault_,
        address projectVault_,
        address ipVault_
    ) public onlyOwner {
        marketVault = marketVault_;
        projectVault = projectVault_;
        ipVault = ipVault_;
    }

    function onERC721Received(
        address,
        address,
        uint,
        bytes calldata
    ) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }

    function onERC1155Received(
        address,
        address,
        uint,
        uint,
        bytes calldata
    ) external pure returns (bytes4) {
        return this.onERC1155Received.selector;
    }
}
