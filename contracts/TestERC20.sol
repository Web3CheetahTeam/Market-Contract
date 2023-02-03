// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestERC20 is ERC20 {
    constructor(
        string memory name_,
        string memory symbol_
    ) ERC20(name_, symbol_) {}

    error TestERROR(uint256 param1, address param2);
    function mint(uint256 amount, address reciever) public {
        revert TestERROR(amount, reciever);
        _mint(reciever, amount);
    }
}
