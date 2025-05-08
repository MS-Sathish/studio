export const CONTRACT_ADDRESS = "0x4612e5fc49d1beFbDCFaDff920Bc708Cd13EA5C6";

export const CONTRACT_ABI = [
    "function depositETH() payable",
    "function withdrawETH(address payable _to, uint256 _amount) external",
    "function getBalance() external view returns (uint256)",
    "function depositERC20(address _token, uint256 _amount) external"
];

export const ERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function decimals() external view returns (uint8)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function balanceOf(address account) external view returns (uint256)"
];
