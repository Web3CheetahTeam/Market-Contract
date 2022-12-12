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
import "contracts/interfaces/IFeeHandler.sol";

contract Market is Admin, EIP712Upgradeable {
    IFeeHandler public feeHandle;

    event SetRoyaltyContract(address feeHandleContract);

    function initialize(IFeeHandler feeHandle) public initializer {
        __Ownable_init();
        __EIP712_init("nft market", "v1.0.0");
        setRoyaltyContract(feeHandle);
    }

    function setRoyaltyContract(IFeeHandler feeHandle) public onlyAdmin {
        feeHandle = feeHandle;
        emit SetRoyaltyContract(address(feeHandle));
    }

    function fulfillOrder(
        OrderParameters calldata order,
        bytes calldata orderSign
    ) public {
        require(_verification(order, orderSign), "Invalid signature");
        require(block.timestamp >= order.startTime, "");
        require(block.timestamp <= order.endTime, "");
        require(
            order.orderType == OrderType.Offer ||
                order.orderType == OrderType.Listing,
            "Invalid OrderType"
        );

        if (order.orderType == OrderType.Offer) {
            _buy(order);
        }

        if (order.orderType == OrderType.Listing) {
            _sell(order);
        }
    }

    function _verification(
        OrderParameters calldata order,
        bytes calldata orderSign
    ) internal returns (bool) {
        return true;
    }

    function _buy(OrderParameters calldata order) internal {}

    function _sell(OrderParameters calldata order) internal {
        // for (uint256 i = 0; i < order.offers.length; ) {
        //     require(
        //         order.offers[i].ItemType == ItemType.ERC721 ||
        //             order.offers[i].ItemType == ItemType.ERC1155,
        //         ""
        //     );
        //     unchecked {
        //         i++;
        //     }
        // }
    }
}
