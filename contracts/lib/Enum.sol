// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

enum TokenType {
    // 0: ETH on mainnet, MATIC on polygon, etc.
    NATIVE,
    // 1: ERC20 items
    ERC20
}

enum NftType {
    // 0: ERC721 items
    ERC721,
    // 1: ERC1155 items
    ERC1155,
    // 2: ERC721 items where a number of tokenIds are supported
    ERC721_WITH_CRITERIA,
    // 3: ERC1155 items where a number of ids are supported
    ERC1155_WITH_CRITERIA
}

enum ItemType {
    // 0: ETH on mainnet, MATIC on polygon, etc.
    NATIVE,
    // 1: ERC20 items (ERC777 and ERC20 analogues could also technically work)
    ERC20,
    // 2: ERC721 items
    ERC721,
    // 3: ERC1155 items
    ERC1155
}