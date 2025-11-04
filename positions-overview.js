const { ethers } = require('ethers');

// Chain details (Bittensor EVM mainnet)
const RPC_URL = 'https://lite.chain.opentensor.ai';  // Public RPC endpoint
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Contract addresses from info.txt
const POOL_ADDRESS = '0x6647dcbeb030dc8E227D8B1A2Cb6A49F3C887E3c';
const POSITIONS_ADDRESS = '0x61EeA4770d7E15e7036f8632f4bcB33AF1Af1e25';
const YOUR_WALLET = '0xD8aB8a077b02670aae04bcdBeF15CAFEA0fB50c9';
const DEC0 = 18;  // WTAO decimals
const DEC1 = 6;   // USDC decimals

// Full UniswapV3Pool ABI (trimmed as before)
const POOL_ABI = [
  'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
  'function liquidity() view returns (uint128)',
  'function fee() view returns (uint24)',
  'function tickSpacing() view returns (int24)'
];

// Positions ABI (as before)
const POSITIONS_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
  'function positions(uint256 tokenId) view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)'
];

// TickMath with full constants from Uniswap V3 TickMath.sol
const Q96 = 2n ** 96n;
class TickMath {
  static getSqrtRatioAtTick(tick) {
    let absTick = Math.abs(tick);
    let ratio = (absTick & 1) !== 0 ? 0xfffcb933bd6fad37aa2d162d1a594001n : 0x100000000000000000000000000000000n;
    if ((absTick & 0x2) !== 0) ratio = (ratio * 0xfff97272373d413259a46990580e213an) >> 128n;
    if ((absTick & 0x4) !== 0) ratio = (ratio * 0xfff2e50f5f656932ef12357cf3c7fdccn) >> 128n;
    if ((absTick & 0x8) !== 0) ratio = (ratio * 0xffe5caca7e10e4e61c3624eaa0941cd0n) >> 128n;
    if ((absTick & 0x10) !== 0) ratio = (ratio * 0xffcb9843d60f6159c9db58835c926644n) >> 128n;
    if ((absTick & 0x20) !== 0) ratio = (ratio * 0xff973b41fa98c081472e6896dfb254c0n) >> 128n;
    if ((absTick & 0x40) !== 0) ratio = (ratio * 0xff2ea16466c96a3843ec78b326b52861n) >> 128n;
    if ((absTick & 0x80) !== 0) ratio = (ratio * 0xfe5dee046a99a2a811c461f1969c3053n) >> 128n;
    if ((absTick & 0x100) !== 0) ratio = (ratio * 0xfcbe86c7900a88aedcffc83b479aa3a4n) >> 128n;
    if ((absTick & 0x200) !== 0) ratio = (ratio * 0xf987a7253ac413176f2b074cf7815e54n) >> 128n;
    if ((absTick & 0x400) !== 0) ratio = (ratio * 0xf3392b0822b70005940c7a398e4b70f3n) >> 128n;
    if ((absTick & 0x800) !== 0) ratio = (ratio * 0xe7159475a2c29b7443b29c7fa6e889d9n) >> 128n;
    if ((absTick & 0x1000) !== 0) ratio = (ratio * 0xd097f3bdfd2022b8845ad8f792aa5825n) >> 128n;
    if ((absTick & 0x2000) !== 0) ratio = (ratio * 0xa9f746462d870fdf8a65dc1f90e061e5n) >> 128n;
    if ((absTick & 0x4000) !== 0) ratio = (ratio * 0x70d869a156d2a1b890bb3df62baf32f7n) >> 128n;
    if ((absTick & 0x8000) !== 0) ratio = (ratio * 0x31be135f97d08fd981231505542fcfa6n) >> 128n;
    if ((absTick & 0x10000) !== 0) ratio = (ratio * 0x9aa508b5b7a84e1c677de54f3e99bc9n) >> 128n;
    if ((absTick & 0x20000) !== 0) ratio = (ratio * 0x5d6af8dedb81196699c329225ee604n) >> 128n;
    if ((absTick & 0x40000) !== 0) ratio = (ratio * 0x2216e584f5fa1ea926041bedfe98n) >> 128n;
    if ((absTick & 0x80000) !== 0) ratio = (ratio * 0x48a170391f7dc42444e8fa2n) >> 128n;

    if (tick > 0) ratio = (2n ** 256n - 1n) / ratio;

    // Round to nearest
    let sqrtRatioX96 = ratio >> 32n;
    if (ratio % (2n ** 32n) !== 0n) sqrtRatioX96 += 1n;

    return sqrtRatioX96;
  }
}

// LiquidityAmounts functions (unchanged, but should now work with correct sqrt ratios)
function mulDiv(a, b, denominator) {
  return (a * b) / denominator;
}

function getAmount0ForLiquidity(sqrtRatioAX96, sqrtRatioBX96, liquidity) {
  if (sqrtRatioAX96 > sqrtRatioBX96) [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
  const numerator1 = liquidity << 96n;
  const numerator2 = sqrtRatioBX96 - sqrtRatioAX96;
  return mulDiv(mulDiv(numerator1, numerator2, sqrtRatioBX96), 1n, sqrtRatioAX96);
}

function getAmount1ForLiquidity(sqrtRatioAX96, sqrtRatioBX96, liquidity) {
  if (sqrtRatioAX96 > sqrtRatioBX96) [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
  return mulDiv(liquidity, sqrtRatioBX96 - sqrtRatioAX96, Q96);
}

function getAmountsForLiquidity(sqrtRatioX96, sqrtRatioAX96, sqrtRatioBX96, liquidity) {
  if (sqrtRatioAX96 > sqrtRatioBX96) [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];

  let amount0 = 0n;
  let amount1 = 0n;

  if (sqrtRatioX96 <= sqrtRatioAX96) {
    amount0 = getAmount0ForLiquidity(sqrtRatioAX96, sqrtRatioBX96, liquidity);
  } else if (sqrtRatioX96 < sqrtRatioBX96) {
    amount0 = getAmount0ForLiquidity(sqrtRatioX96, sqrtRatioBX96, liquidity);
    amount1 = getAmount1ForLiquidity(sqrtRatioAX96, sqrtRatioX96, liquidity);
  } else {
    amount1 = getAmount1ForLiquidity(sqrtRatioAX96, sqrtRatioBX96, liquidity);
  }

  return { amount0, amount1 };
}

// Price calculation (unchanged, works correctly)
function computePrice(sqrtPriceX96) {
  const decDiff = 12;
  const priceDecimals = 2;
  const adjustment = 10n ** BigInt(decDiff + priceDecimals);
  const numerator = sqrtPriceX96 * sqrtPriceX96 * adjustment;
  const denom = 2n ** 192n;
  const scaledBig = numerator / denom;
  return Number(scaledBig) / 10 ** priceDecimals;
}

function tickToPrice(tick) {
  const sqrtRatioX96 = TickMath.getSqrtRatioAtTick(tick);
  return computePrice(sqrtRatioX96);
}

async function getLPOverview() {
  try {
    const network = await provider.getNetwork();
    console.log(`Connected to chain: ${network.name} (ID: ${network.chainId})`);

    // Get pool state
    const pool = new ethers.Contract(POOL_ADDRESS, POOL_ABI, provider);
    const slot0 = await pool.slot0();
    const currentTick = Number(slot0.tick);
    const sqrtPriceX96 = BigInt(slot0.sqrtPriceX96);
    const currentPrice = computePrice(sqrtPriceX96);

    console.log(`\nPool Snapshot:`);
    console.log(`- Current Tick: ${currentTick}`);
    console.log(`- Current Price (USDC per WTAO): ≈$${currentPrice.toFixed(2)}`);

    // Get positions
    const positionManager = new ethers.Contract(POSITIONS_ADDRESS, POSITIONS_ABI, provider);
    const balance = Number(await positionManager.balanceOf(YOUR_WALLET));
    console.log(`\nTotal Positions Found: ${balance}`);
    let activeCount = 0;

    for (let i = 0; i < balance; i++) {
      const tokenIdBig = await positionManager.tokenOfOwnerByIndex(YOUR_WALLET, BigInt(i));
      const pos = await positionManager.positions(tokenIdBig);

      if (pos.liquidity === 0n) continue;  // Skip inactive

      activeCount++;
      const tickLower = Number(pos.tickLower);
      const tickUpper = Number(pos.tickUpper);
      const priceLower = tickToPrice(tickLower);
      const priceUpper = tickToPrice(tickUpper);
      const inRange = currentTick >= tickLower && currentTick < tickUpper;

      const { amount0, amount1 } = getAmountsForLiquidity(sqrtPriceX96, TickMath.getSqrtRatioAtTick(tickLower), TickMath.getSqrtRatioAtTick(tickUpper), pos.liquidity);

      console.log(`\nActive Position #${activeCount} (Token ID: ${tokenIdBig.toString()}):`);
      console.log(`- Tick Range: ${tickLower} to ${tickUpper}`);
      console.log(`- Price Range (USDC per WTAO): ≈$${priceLower.toFixed(2)} to $${priceUpper.toFixed(2)}`);
      console.log(`- In Range: ${inRange ? 'Yes' : 'No'}`);
      console.log(`- Liquidity: ${pos.liquidity.toString()} (raw units)`);
      console.log(`- Locked Amounts: ${ethers.formatUnits(amount0, DEC0)} WTAO, ${ethers.formatUnits(amount1, DEC1)} USDC`);
      console.log(`- Unclaimed Fees: ${ethers.formatUnits(pos.tokensOwed0, DEC0)} WTAO, ${ethers.formatUnits(pos.tokensOwed1, DEC1)} USDC`);
      console.log(`- Fee Tier: ${Number(pos.fee) / 10000}%`);
    }

    if (activeCount === 0) {
      console.log('No active positions (liquidity > 0) found.');
    }
  } catch (error) {
    console.error('Error getting LP overview:', error.message);
  }
}

getLPOverview();