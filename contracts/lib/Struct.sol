// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "contracts/lib/Enum.sol";

struct OrderParameter {
    // bider or seller
    address offerer;
    // erc20 token or native token info
    TokenType tokenType;
    address token;
    uint256 amount;
    // nft info
    NftType nftType;
    address nftToken;
    uint256 identifierOrCriteria;
    uint64 quantity;
    // other info
    address payable recipient;
    uint64 startTime;
    uint64 endTime;
    uint256 salt; // uint256(bytes16(Millisecond) + bytes(random)), only
}

contract OrderParameterBase {
    bytes32 private constant orderTypeHash =
        keccak256(
            abi.encodePacked(
                "OrderParameter(",
                "address offerer,",
                "uint8 tokenType,",
                "address token,",
                "uint256 amount,",
                "uint8 nftType,",
                "address nftToken,",
                "uint256 identifierOrCriteria,",
                "uint256 quantity,",
                "address recipient,",
                "uint64 startTime,",
                "uint64 endTime,",
                "uint256 salt",
                ")"
            )
        );

    function hashOrderParameter(OrderParameter memory _order)
        internal
        pure
        returns (bytes32)
    {
        return
            keccak256(
                abi.encode(
                    orderTypeHash,
                    _order.offerer,
                    _order.tokenType,
                    _order.token,
                    _order.amount,
                    _order.nftType,
                    _order.nftToken,
                    _order.identifierOrCriteria,
                    _order.quantity,
                    _order.recipient,
                    _order.startTime,
                    _order.endTime,
                    _order.salt
                )
            );
    }
}
