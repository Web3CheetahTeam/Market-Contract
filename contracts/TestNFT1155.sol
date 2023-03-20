// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract TestNFT1155 is ERC1155 {
    mapping(uint256 => string) internal tokenURIs;

    constructor(string memory uri_) ERC1155(uri_) {}

    function mint(uint256 tokenID, uint256 amount, address reciever) public {
        _mint(reciever, tokenID, amount, "0x00");
    }

    function tokenURI(
        uint256 tokenID
    ) public view virtual returns (string memory) {
        return tokenURIs[tokenID];
    }

    function setTokenURI(uint256 tokenID, string calldata uri) public {
        tokenURIs[tokenID] = uri;
    }
}
