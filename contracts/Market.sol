// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/IERC165Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
import "contracts/lib/Struct.sol";
import "contracts/lib/Enum.sol";
import "contracts/lib/Admin.sol";
import "contracts/lib/Pause.sol";
import "contracts/interfaces/IFeeHandler.sol";

contract Market is Admin, Pause, EIP712Upgradeable, OrderParameterBase {
    IFeeHandler public feeHandle;

    mapping(address => bool) public whitelist; // Users in the whitelist can enjoy free transaction fee

    // user => (slat => bool)
    mapping(address => mapping(uint256 => bool)) public canceled;

    struct OrderState {
        bool ended;
        uint64 quantity;
    }

    // quantity of buy or sell
    // (salt => OrderState)
    mapping(uint256 => OrderState) public usedOrderState;

    event SetRoyaltyContract(address indexed feeHandleContract);
    event SetWhiteList(address[] users, bool[] list);
    event Canceled(address indexed canceller, uint256 indexed salt);
    event Bought(uint256 indexed salt, uint256 indexed quantity);
    event Sold(
        uint256 indexed salt,
        uint256 indexed tokenId,
        uint256 indexed quantity
    );

    modifier onlyCaller() {
        require(tx.origin == msg.sender, "Invalid caller");
        _;
    }

    modifier checkOrder(OrderParameter memory _order, uint64 _quantity) {
        require(_quantity > 0, "quantity must be greater than 0");
        require(block.timestamp >= _order.startTime, "Order not started");
        require(block.timestamp <= _order.endTime, "Order ended");
        require(!usedOrderState[_order.salt].ended, "Order used");
        require(
            _order.quantity >= usedOrderState[_order.salt].quantity + _quantity
        );
        _;
    }

    modifier whenNotCancel(address _offerer, uint256 _salt) {
        require(!canceled[_offerer][_salt], "Canceled");
        _;
    }

    function initialize(address _feeHandle) public initializer {
        __Ownable_init();
        __EIP712_init("nft market", "v1.0.0");
        setRoyaltyContract(_feeHandle);
    }

    function setRoyaltyContract(address _feeHandle) public onlyAdmin {
        feeHandle = IFeeHandler(_feeHandle);
        emit SetRoyaltyContract(_feeHandle);
    }

    function setWhiteList(address[] memory users, bool[] memory list) public {
        require(users.length == list.length, "Length mismatch");
        for (uint256 i = 0; i < users.length; ) {
            whitelist[users[i]] = list[i];
        }
        emit SetWhiteList(users, list);
    }

    function buy(
        OrderParameter[] memory _orders,
        bytes[] memory _orderSigns,
        uint64[] memory _quantitys
    ) external onlyCaller whenNotPaused {
        require(
            _orders.length == _orderSigns.length &&
                _orders.length == _quantitys.length,
            "Length mismatch"
        );
        for (uint256 i = 0; i < _orders.length; ) {
            require(
                _verification(_orders[i], _orderSigns[i]),
                "Invalid signature"
            );
            _buy(_orders[i], _quantitys[i]);
            unchecked {
                i++;
            }
        }
    }

    function sell(
        OrderParameter memory _order,
        bytes memory _orderSign,
        uint256 _tokenId,
        uint64 _quantity
    ) external onlyCaller whenNotPaused {
        require(_verification(_order, _orderSign), "Invalid signature");
        _sell(_order, _tokenId, _quantity);
    }

    function _buy(OrderParameter memory _order, uint64 _quantity)
        internal
        checkOrder(_order, _quantity)
    {
        if (_order.nftType == NftType.ERC721) {
            _buyErc721(_order);
        } else if (_order.nftType == NftType.ERC1155) {
            _buyErc1155(_order, _quantity);
        } else {
            require(
                false,
                "Only the nft of erc721 or erc1155 can be purchased"
            );
        }
    }

    function _buyErc721(OrderParameter memory _order) internal {
        require(
            IERC721Upgradeable(_order.nftToken).ownerOf(
                _order.identifierOrCriteria
            ) == _order.offerer,
            "TokenId is not offerer"
        );

        // require(
        //     IERC165Upgradeable(_order.nftToken).supportsInterface(type(IERC721Upgradeable).interfaceId), "Invaild ERC721 contract"
        // );

        _handleFee(
            _order.tokenType,
            _order.nftToken,
            _order.token,
            _order.amount,
            _order.recipient
        );

        IERC721Upgradeable(_order.nftToken).safeTransferFrom(
            _order.offerer,
            msg.sender,
            _order.identifierOrCriteria
        );

        usedOrderState[_order.salt] = OrderState({ended: true, quantity: 1});

        emit Bought(_order.salt, 1);
    }

    function _buyErc1155(OrderParameter memory _order, uint64 _quantity)
        internal
    {
        // require(
        //     IERC165Upgradeable(_order.nftToken).supportsInterface(type(IERC1155Upgradeable).interfaceId), "Invaild ERC1155 contract"
        // );

        require(
            IERC1155Upgradeable(_order.nftToken).balanceOf(
                _order.offerer,
                _order.identifierOrCriteria
            ) > _quantity,
            "Insufficient tokenId"
        );

        _handleFee(
            _order.tokenType,
            _order.nftToken,
            _order.token,
            _order.amount * _quantity,
            _order.recipient
        );

        IERC1155Upgradeable(_order.nftToken).safeTransferFrom(
            _order.offerer,
            msg.sender,
            _order.identifierOrCriteria,
            _quantity,
            ""
        );

        usedOrderState[_order.salt].quantity =
            usedOrderState[_order.salt].quantity +
            _quantity;

        emit Bought(_order.salt, _quantity);
    }

    function _sell(
        OrderParameter memory _order,
        uint256 _tokenId,
        uint64 _quantity
    ) internal checkOrder(_order, _quantity) {
        require(_order.tokenType == TokenType.ERC20, "Only support ERC20");
        if (
            _order.nftType == NftType.ERC721 ||
            _order.nftType == NftType.ERC1155
        ) {
            require(
                _order.identifierOrCriteria == _tokenId,
                "TokenID does not match identifierOrCriteria"
            );
        }

        if (
            _order.nftType == NftType.ERC721 ||
            _order.nftType == NftType.ERC721_WITH_CRITERIA
        ) {
            require(
                IERC721Upgradeable(_order.nftToken).ownerOf(_tokenId) ==
                    msg.sender,
                "TokenId is not offerer"
            );
            IERC721Upgradeable(_order.nftToken).safeTransferFrom(
                msg.sender,
                address(_order.recipient),
                _tokenId
            );
            _quantity = 1;
        } else {
            require(
                IERC1155Upgradeable(_order.nftToken).balanceOf(
                    msg.sender,
                    _tokenId
                ) > _quantity,
                "Insufficient tokenId"
            );
            IERC1155Upgradeable(_order.nftToken).safeTransferFrom(
                msg.sender,
                address(_order.recipient),
                _tokenId,
                _quantity,
                ""
            );
        }

        usedOrderState[_order.salt].quantity =
            usedOrderState[_order.salt].quantity +
            _quantity;

        _handleFee(
            _order.tokenType,
            _order.nftToken,
            _order.token,
            _order.amount * _quantity,
            _order.offerer
        );

        emit Sold(_order.salt, _tokenId, _quantity);
    }

    function _handleFee(
        TokenType _tokenType,
        address _nftToken,
        address _token,
        uint256 _amount,
        address _recipient
    ) internal {
        (uint256 fee_, uint256 remaining_) = IFeeHandler(feeHandle)
            .getFeeAndRemaining(_nftToken, _amount);

        if (whitelist[msg.sender]) {
            _amount = remaining_;
            fee_ = 0;
        }

        if (whitelist[_recipient]) {
            remaining_ = _amount;
            fee_ = 0;
        }

        if (_tokenType == TokenType.ERC20) {
            require(
                IERC20Upgradeable(_token).transferFrom(
                    msg.sender,
                    address(this),
                    _amount
                ),
                "Erc20 transfer to this contract failed"
            );

            require(
                IERC20Upgradeable(_token).transfer(_recipient, remaining_),
                "Erc20 transfer to recipient failed"
            );

            if (fee_ > 0) {
                require(
                    IERC20Upgradeable(_token).approve(address(feeHandle), fee_),
                    "Approve to feeHandler failed"
                );
                IFeeHandler(feeHandle).chargeFeeToken(_nftToken, _token, fee_);
            }
        } else {
            payable(_recipient).transfer(remaining_);
            if (fee_ > 0) {
                IFeeHandler(feeHandle).chargeFeeETH{value: fee_}(_nftToken);
            }
            if (msg.value > _amount) {
                payable(msg.sender).transfer(msg.value - _amount);
            }
        }
    }

    function cancel(uint256 _salt) external whenNotPaused {
        canceled[msg.sender][_salt] = true;
        emit Canceled(msg.sender, _salt);
    }

    function _verification(
        OrderParameter memory _order,
        bytes memory _orderSign
    ) internal view returns (bool) {
        bytes32 digest = _hashTypedDataV4(hashOrderParameter(_order));
        return ECDSAUpgradeable.recover(digest, _orderSign) == _order.offerer;
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
