// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

enum ItemType {
    // 0: ETH on mainnet, MATIC on polygon, etc.
    NATIVE,
    // 1: ERC20 items
    ERC20,
    // 2: ERC721 items
    ERC721,
    // 3: ERC1155 items
    ERC1155,
    // 4: ERC721 items where a number of tokenIds are supported
    ERC721_WITH_CRITERIA,
    // 5: ERC1155 items where a number of ids are supported
    ERC1155_WITH_CRITERIA
}

enum OrderType {
    // 0: offer order
    Offer,
    // 1: nft sales list
    Listing
}
