// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface IFeeHandler {
    /// @param collection collection address
    function getFeeAndRemaining(address collection, uint256 amount)
        external
        view
        returns (uint256 fee, uint256 remaining);

    /// @param collection collection address
    /// @dev msg.value platformFee + projectFee + ipFee
    function chargeFeeETH(address collection) external payable;

    /// @param collection collection address
    /// @param token erc20 contract address, transfer erc20 to fee receiver
    /// @param fee platformFee + projectFee + ipFee
    function chargeFeeToken(
        address collection,
        address token,
        uint256 fee
    ) external;
}
