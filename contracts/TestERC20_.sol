// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

import "./ERC20/ERC20.sol";

contract TestERC20_ is ERC20 {
    constructor(
        string memory name_,
        string memory symbol_
    ) ERC20(name_, symbol_) {
        
    }

    function mint(uint256 amount, address reciever) public {
        _mint(reciever, amount);
    }
}
