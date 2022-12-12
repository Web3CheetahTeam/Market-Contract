// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "contracts/interfaces/IFeeHandler.sol";
import "contracts/lib/Admin.sol";

contract FeeHandle is Admin, IFeeHandler {
    uint256 public constant ratio = 1000;
    uint256 public maxFeeRatio; // limit of royalty fee

    address public feeReceiver; // receiver of platform fee
    uint256 public feeRatio; // platform fee (default)

    struct ChargingItem {
        uint16 platformRatio; // Platform service charge
        address projectReceiver; // project receiver
        uint16 projectRatio; // project ratial
        uint16 ipRatio; // ip ratio
        address ipReceiver; // ip receiver
    }

    // collection address => ChargingItem
    mapping(address => ChargingItem) public collectionChargingItem;

    event SetPlatformFeeReceiver(address receiver);
    event SetPlatformDefaultRatio(uint256 ratio);
    event SetMaxRatio(uint256 ratio);

    event SetCollectionFeeAndReceiver(ChargingItem item);
    event ChargeFeeETH(
        address indexed platformReceiver,
        address indexed projectReceiver,
        address indexed ipReceiver,
        address collection,
        uint256 platformFee,
        uint256 projectFee,
        uint256 ipFee
    );

    event ChargeFeeToken(
        address indexed platformReceiver,
        address indexed projectReceiver,
        address indexed ipReceiver,
        address collection,
        address token,
        uint256 platformFee,
        uint256 projectFee,
        uint256 ipFee
    );

    function initialize(address _feeReceiver) public initializer {
        if (_feeReceiver == address(0)) {
            feeReceiver = address(this);
        } else {
            feeReceiver = _feeReceiver;
        }
        __Ownable_init();
        maxFeeRatio = 100; // 100 / 1000 = 0.1
        feeRatio = 30; // 30 / 1000  = 0.03
    }

    function setPlatformFeeReceiver(address _feeReceiver) external onlyOwner {
        feeReceiver = _feeReceiver;
        emit SetPlatformFeeReceiver(_feeReceiver);
    }

    function setPlatformDefaultFeeRatio(uint256 _feeRatio) external onlyAdmin {
        require(
            _feeRatio <= maxFeeRatio,
            "FeeHanle: maxFeeRatio limit exceeded"
        );
        feeRatio = _feeRatio;
        emit SetPlatformDefaultRatio(_feeRatio);
    }

    function setMaxFeeRatio(uint256 _maxFeeRatio) external onlyAdmin {
        require(_maxFeeRatio < ratio, "FeeHandle: ratio limit exceeded");
        require(_maxFeeRatio > 0, "FeeHandle: invaild maxFeeRatio");
        maxFeeRatio = _maxFeeRatio;
        emit SetMaxRatio(_maxFeeRatio);
    }

    function getFeeAndRemaining(address _collection, uint256 _amount)
        public
        view
        returns (uint256 fee, uint256 remaining)
    {
        (uint256 platformFee, uint256 projectFee, uint256 ipFee) = getFeeDetail(
            _collection,
            _amount
        );
        fee = platformFee + projectFee + ipFee;
        remaining = _amount - fee;
        return (fee, remaining);
    }

    function getFeeDetail(address _collection, uint256 _amount)
        public
        view
        returns (
            uint256 platformFee,
            uint256 projectFee,
            uint256 ipFee
        )
    {
        ChargingItem memory item_ = collectionChargingItem[_collection];
        if (
            item_.platformRatio == 0 &&
            item_.projectReceiver == address(0) &&
            item_.projectRatio == 0 &&
            item_.ipReceiver == address(0) &&
            item_.ipRatio == 0
        ) {
            platformFee = (_amount * feeRatio) / ratio;
        } else {
            platformFee = ((_amount * item_.platformRatio) / ratio);
            projectFee = ((_amount * item_.projectRatio) / ratio);
            ipFee = ((_amount * item_.ipRatio) / ratio);
        }
        return (platformFee, projectFee, ipFee);
    }

    function collectionTotalFee(address _collection, uint256 _amount)
        public
        view
        returns (uint256)
    {
        (uint256 platformFee, uint256 projectFee, uint256 ipFee) = getFeeDetail(
            _collection,
            _amount
        );
        return platformFee + projectFee + ipFee;
    }

    function chargeFeeETH(address _collection) external payable {
        if (msg.value == 0) {
            return;
        }

        ChargingItem memory item_ = collectionChargingItem[_collection];
        (
            uint256 platformFee_,
            uint256 projectFee_,
            uint256 ipFee_
        ) = _calculationFee(item_, msg.value);

        if (feeReceiver != address(this) && platformFee_ > 0) {
            payable(feeReceiver).transfer(platformFee_);
        }

        if (
            projectFee_ > 0 &&
            item_.projectReceiver != address(this) &&
            item_.projectReceiver != address(0)
        ) {
            payable(item_.projectReceiver).transfer(projectFee_);
        }

        if (
            ipFee_ > 0 &&
            item_.ipReceiver != address(this) &&
            item_.ipReceiver != address(0)
        ) {
            payable(item_.ipReceiver).transfer(ipFee_);
        }

        emit ChargeFeeETH(
            feeReceiver,
            item_.projectReceiver,
            item_.ipReceiver,
            _collection,
            platformFee_,
            projectFee_,
            ipFee_
        );
    }

    function chargeFeeToken(
        address _collection,
        address _token,
        uint256 _fee
    ) external {
        address from_ = msg.sender;
        ChargingItem memory item_ = collectionChargingItem[_collection];
        (
            uint256 platformFee_,
            uint256 projectFee_,
            uint256 ipFee_
        ) = _calculationFee(item_, _fee);

        if (feeReceiver != address(this) && platformFee_ > 0) {
            require(
                IERC20Upgradeable(_token).transferFrom(
                    from_,
                    feeReceiver,
                    platformFee_
                ),
                "FeeHandle: transfer failed"
            );
        }

        if (
            projectFee_ > 0 &&
            item_.projectReceiver != address(this) &&
            item_.projectReceiver != address(0)
        ) {
            require(
                IERC20Upgradeable(_token).transferFrom(
                    from_,
                    item_.projectReceiver,
                    projectFee_
                ),
                "FeeHandle: transfer failed"
            );
        }

        if (
            ipFee_ > 0 &&
            item_.ipReceiver != address(this) &&
            item_.ipReceiver != address(0)
        ) {
            require(
                IERC20Upgradeable(_token).transferFrom(
                    from_,
                    item_.ipReceiver,
                    ipFee_
                ),
                "FeeHandle: transfer failed"
            );
        }

        emit ChargeFeeToken(
            feeReceiver,
            item_.projectReceiver,
            item_.ipReceiver,
            _collection,
            _token,
            platformFee_,
            projectFee_,
            ipFee_
        );
    }

    function _calculationFee(ChargingItem memory _item, uint256 _fee)
        internal
        pure
        returns (
            uint256 platformFee,
            uint256 projectFee,
            uint256 ipFee
        )
    {
        if (
            _item.platformRatio == 0 &&
            _item.projectReceiver == address(0) &&
            _item.projectRatio == 0 &&
            _item.ipReceiver == address(0) &&
            _item.ipRatio == 0
        ) {
            platformFee = _fee;
        } else {
            uint256 ratio_ = _item.platformRatio +
                _item.projectRatio +
                _item.ipRatio;
            projectFee = ((_fee * _item.projectRatio) / ratio_);
            ipFee = ((_fee * _item.ipRatio) / ratio_);
            platformFee = _fee - projectFee - ipFee;
        }
        return (platformFee, projectFee, ipFee);
    }

    function setCollectionChargingItem(
        address _collection,
        uint16 _platformRatio,
        address _projectReceiver,
        uint16 _projectRatio,
        uint16 _ipRatio,
        address _ipReceiver
    ) external onlyAdmin {
        require(
            _platformRatio <= maxFeeRatio,
            "FeeHanle: _platformRatio Cannot exceed maxRatio"
        );
        require(
            _projectRatio <= maxFeeRatio,
            "FeeHanle: _projectRatio Cannot exceed maxRatio"
        );
        require(
            _ipRatio <= maxFeeRatio,
            "FeeHanle: _ipRatio Cannot exceed maxRatio"
        );
        require(
            _platformRatio + _projectRatio + _ipRatio < ratio,
            "FeeHanle: total fee exceed ratio"
        );

        // (bool success_, bytes memory res_) = _collection.staticcall(
        //     abi.encodeWithSignature("owner")
        // );
        // require(success_, "Static call owner failed");
        // require(
        //     address(bytes20(res_)) == msg.sender,
        //     "Not the owner of the contract"
        // );

        ChargingItem memory item_ = ChargingItem({
            platformRatio: _platformRatio,
            projectReceiver: _projectReceiver,
            projectRatio: _projectRatio,
            ipRatio: _ipRatio,
            ipReceiver: _ipReceiver
        });

        collectionChargingItem[_collection] = item_;

        emit SetCollectionFeeAndReceiver(item_);
    }

    /// @notice withdraw native token to '_to'
    function sendReward(address payable _to, uint256 _amount)
        external
        onlyOwner
    {
        require(address(this).balance >= _amount, "INSUFFICIENT AMOUNT");
        _to.transfer(_amount);
    }

    /// @notice withdraw erc20 token to '_to'
    function sendERC20Reward(
        address _token,
        address _to,
        uint256 _amount
    ) external onlyOwner {
        require(
            IERC20Upgradeable(_token).balanceOf(address(this)) >= _amount,
            "INSUFFICIENT AMOUNT"
        );
        require(
            IERC20Upgradeable(_token).transfer(_to, _amount),
            "transfer failed"
        );
    }
}
