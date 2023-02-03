// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract TestNFT is ERC721 {
    mapping(uint256 => string) internal tokenURIs;

    constructor(string memory name_, string memory symbol_)
        ERC721(name_, symbol_)
    {}

    function mint(
        uint256 tokenIDStart,
        uint256 tokenIDEnd,
        address reciever
    ) public {
        require(tokenIDStart <= tokenIDEnd);
        for (uint256 i = tokenIDStart; i <= tokenIDEnd; i++) {
            _safeMint(reciever, i);
        }
    }

    function tokenURI(uint256 tokenID)
        public
        view
        virtual
        override
        returns (string memory)
    {
        return tokenURIs[tokenID];
    }

    function setTokenURI(uint256 tokenID, string calldata uri) public {
        tokenURIs[tokenID] = uri;
    }
}
