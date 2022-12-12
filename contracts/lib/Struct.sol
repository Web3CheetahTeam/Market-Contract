// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "contracts/lib/Enum.sol";

struct OfferItem {
    ItemType itemType;
    address token;
    uint256 identifierOrCriteria;
    uint256 amount;
}

struct ConsiderationItem {
    ItemType itemType;
    address token;
    uint256 identifierOrCriteria;
    uint256 amount;
    address payable recipient;
}

struct OrderParameters {
    address offerer; // buyer or seller
    OfferItem[] offers;
    ConsiderationItem[] considerations;
    uint64 startTime;
    uint64 endTime;
    uint256 salt;
    OrderType orderType;
}
