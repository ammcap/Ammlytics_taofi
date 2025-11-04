const { ethers } = require('ethers');

// Chain details (Bittensor EVM mainnet)
const RPC_URL = 'https://lite.chain.opentensor.ai';  // Public RPC endpoint
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Contract addresses from info.txt
const POOL_ADDRESS = '0x6647dcbeb030dc8E227D8B1A2Cb6A49F3C887E3c';
const WTAO_ADDRESS = '0x9Dc08C6e2BF0F1eeD1E00670f80Df39145529F81';
const USDC_ADDRESS = '0xB833E8137FEDf80de7E908dc6fea43a029142F20';

// Minimal ERC20 ABI for symbol and decimals
const ERC20_ABI = [
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)'
];

// UniswapV3Pool ABI (expanded slightly for tickSpacing)
const POOL_ABI = [
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function fee() view returns (uint24)',
  'function tickSpacing() view returns (int24)'
];

async function verifyContracts() {
  try {
    const network = await provider.getNetwork();
    console.log(`Connected to chain: ${network.name} (ID: ${network.chainId})`);  // Should be unknown (964) or similar for Bittensor

    // Connect to pool contract
    const pool = new ethers.Contract(POOL_ADDRESS, POOL_ABI, provider);
    const token0 = await pool.token0();
    const token1 = await pool.token1();
    const fee = await pool.fee();
    const tickSpacing = await pool.tickSpacing();

    console.log('Pool Verification:');
    console.log(`- Token0: ${token0} (Should match WTAO: ${token0.toLowerCase() === WTAO_ADDRESS.toLowerCase() ? 'Match' : 'Mismatch'})`);
    console.log(`- Token1: ${token1} (Should match USDC: ${token1.toLowerCase() === USDC_ADDRESS.toLowerCase() ? 'Match' : 'Mismatch'})`);
    console.log(`- Fee: ${Number(fee) / 10000}%`);  // e.g., 0.3% for 3000
    console.log(`- Tick Spacing: ${Number(tickSpacing)} (Common for 0.3% pools: 60)`);

    // Verify WTAO token
    const wtao = new ethers.Contract(WTAO_ADDRESS, ERC20_ABI, provider);
    const wtaoSymbol = await wtao.symbol();
    const wtaoDecimals = await wtao.decimals();
    console.log('\nWTAO Token:');
    console.log(`- Symbol: ${wtaoSymbol} (Expected: WTAO or similar)`);
    console.log(`- Decimals: ${Number(wtaoDecimals)} (Expected: 9 for TAO)`);

    // Verify USDC token
    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
    const usdcSymbol = await usdc.symbol();
    const usdcDecimals = await usdc.decimals();
    console.log('\nUSDC Token:');
    console.log(`- Symbol: ${usdcSymbol} (Expected: USDC)`);
    console.log(`- Decimals: ${Number(usdcDecimals)} (Expected: 6)`);
  } catch (error) {
    console.error('Error verifying contracts:', error.message);
  }
}

verifyContracts();