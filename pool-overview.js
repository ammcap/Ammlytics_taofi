const { ethers } = require('ethers');

// Chain details (Bittensor EVM mainnet)
const RPC_URL = 'https://lite.chain.opentensor.ai';  // Public RPC endpoint
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Contract addresses from info.txt
const POOL_ADDRESS = '0x6647dcbeb030dc8E227D8B1A2Cb6A49F3C887E3c';
const WTAO_ADDRESS = '0x9Dc08C6e2BF0F1eeD1E00670f80Df39145529F81';
const USDC_ADDRESS = '0xB833E8137FEDf80de7E908dc6fea43a029142F20';

// Minimal ERC20 ABI for decimals (symbol removed as no longer needed here)
const ERC20_ABI = [
  'function decimals() view returns (uint8)'
];

// Full UniswapV3Pool ABI (from your JSON; events and constructor omitted for script size)
const POOL_ABI = [
  'function factory() view returns (address)',
  'function fee() view returns (uint24)',
  'function feeGrowthGlobal0X128() view returns (uint256)',
  'function feeGrowthGlobal1X128() view returns (uint256)',
  'function liquidity() view returns (uint128)',
  'function maxLiquidityPerTick() view returns (uint128)',
  'function observations(uint256) view returns (uint32 blockTimestamp, int56 tickCumulative, uint160 secondsPerLiquidityCumulativeX128, bool initialized)',
  'function observe(uint32[] secondsAgos) view returns (int56[] tickCumulatives, uint160[] secondsPerLiquidityCumulativeX128s)',
  'function positions(bytes32) view returns (uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)',
  'function protocolFees() view returns (uint128 token0, uint128 token1)',
  'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
  'function snapshotCumulativesInside(int24 tickLower, int24 tickUpper) view returns (int56 tickCumulativeInside, uint160 secondsPerLiquidityInsideX128, uint32 secondsInside)',
  'function tickBitmap(int16) view returns (uint256)',
  'function tickSpacing() view returns (int24)',
  'function ticks(int24) view returns (uint128 liquidityGross, int128 liquidityNet, uint256 feeGrowthOutside0X128, uint256 feeGrowthOutside1X128, int56 tickCumulativeOutside, uint160 secondsPerLiquidityOutsideX128, uint32 secondsOutside, bool initialized)',
  'function token0() view returns (address)',
  'function token1() view returns (address)'
];

async function getPoolOverview() {
  try {
    const network = await provider.getNetwork();
    console.log(`Connected to chain: ${network.name} (ID: ${network.chainId})`);

    // Connect to pool and tokens
    const pool = new ethers.Contract(POOL_ADDRESS, POOL_ABI, provider);
    const wtao = new ethers.Contract(WTAO_ADDRESS, ERC20_ABI, provider);
    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);

    // Get decimals for price adjustment
    const dec0 = await wtao.decimals();  // WTAO: 18
    const dec1 = await usdc.decimals();  // USDC: 6

    // Get pool state
    const slot0 = await pool.slot0();
    const liquidity = await pool.liquidity();
    const fee = await pool.fee();
    const tickSpacing = await pool.tickSpacing();

    // Calculate price: USDC per WTAO (human-readable, with BigInt scaling for precision)
    const sqrtPriceX96 = BigInt(slot0.sqrtPriceX96);
    const decDiff = Number(dec0) - Number(dec1);  // 12
    const priceDecimals = 2;  // For toFixed(2)
    const adjustment = 10n ** BigInt(decDiff + priceDecimals);  // 10^(12 + 2) = 10^14
    const numerator = sqrtPriceX96 * sqrtPriceX96 * adjustment;
    const denom = 2n ** 192n;
    const scaledBig = numerator / denom;
    const price = Number(scaledBig) / 10 ** priceDecimals;

    console.log('Pool Overview:');
    console.log(`- Current Tick: ${Number(slot0.tick)}`);
    console.log(`- Liquidity: ${liquidity} (raw units)`);
    console.log(`- Price (USDC per WTAO): ≈$${price.toFixed(2)}`);
    console.log(`- Fee: ${Number(fee) / 10000}%`);
    console.log(`- Tick Spacing: ${Number(tickSpacing)}`);
  } catch (error) {
    console.error('Error getting pool overview:', error.message);
  }
}

getPoolOverview();