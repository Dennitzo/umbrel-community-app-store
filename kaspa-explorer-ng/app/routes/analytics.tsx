import KasLink from "../KasLink";
import PageTable from "../PageTable";
import ArrowRight from "../assets/arrow-right.svg";
import AnalyticsIcon from "../assets/analytics.svg";
import BarChart from "../assets/bar_chart.svg";
import Box from "../assets/box.svg";
import Coins from "../assets/coins.svg";
import FlashOn from "../assets/flash_on.svg";
import PieChart from "../assets/pie_chart.svg";
import Reward from "../assets/reward.svg";
import Swap from "../assets/swap.svg";
import { MarketDataContext } from "../context/MarketDataProvider";
import { useBlockdagInfo } from "../hooks/useBlockDagInfo";
import { useBlockReward } from "../hooks/useBlockReward";
import { useCoinSupply } from "../hooks/useCoinSupply";
import { useFeeEstimate } from "../hooks/useFeeEstimate";
import { useHalving } from "../hooks/useHalving";
import { useHashrate } from "../hooks/useHashrate";
import { useIncomingBlocks } from "../hooks/useIncomingBlocks";
import { useMempoolSize } from "../hooks/useMempoolSize";
import dayjs from "dayjs";
import numeral from "numeral";
import React, { useContext } from "react";

export function meta() {
  return [
    { title: "Kaspa Analytics - Network Stats & Charts | Kaspa Explorer" },
    {
      name: "description",
      content:
        "Analyze the Kaspa blockchain with real-time charts and statistics. Track block production, hash rate, difficulty, and network growth.",
    },
    {
      name: "keywords",
      content: "Kaspa analytics, blockchain stats, network charts, hash rate, difficulty, block time",
    },
  ];
}

const TOTAL_SUPPLY = 28_700_000_000;

const formatDifficulty = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return { value: "0", unit: "" };
  }

  const units = ["", "K", "M", "G", "T", "P", "E"];
  let unitIndex = 0;
  let scaled = value;
  while (scaled >= 1000 && unitIndex < units.length - 1) {
    scaled /= 1000;
    unitIndex += 1;
  }

  return {
    value: numeral(scaled).format("0,0.[00]"),
    unit: units[unitIndex],
  };
};

const formatHashrate = (valueTh: number) => {
  if (!Number.isFinite(valueTh) || valueTh <= 0) {
    return { value: "0", unit: "TH/s" };
  }
  const units = ["TH/s", "PH/s", "EH/s", "ZH/s"];
  let unitIndex = 0;
  let scaled = valueTh;
  while (scaled >= 1000 && unitIndex < units.length - 1) {
    scaled /= 1000;
    unitIndex += 1;
  }
  return { value: numeral(scaled).format("0,0.[00]"), unit: units[unitIndex] };
};

export default function Analytics() {
  const { data: blockDagInfo, isLoading: isLoadingBlockDagInfo } = useBlockdagInfo();
  const { data: coinSupply, isLoading: isLoadingCoinSupply } = useCoinSupply();
  const { data: blockReward, isLoading: isLoadingBlockReward } = useBlockReward();
  const { data: halving, isLoading: isLoadingHalving } = useHalving();
  const { data: hashrate, isLoading: isLoadingHashrate } = useHashrate();
  const { data: feeEstimate, isLoading: isLoadingFee } = useFeeEstimate();
  const { mempoolSize } = useMempoolSize();
  const { blocks, avgBlockTime, avgTxRate, transactions } = useIncomingBlocks();
  const marketData = useContext(MarketDataContext);

  const hashrateDisplay = isLoadingHashrate ? { value: "--", unit: "" } : formatHashrate(hashrate?.hashrate ?? 0);
  const difficultyDisplay = isLoadingBlockDagInfo
    ? { value: "--", unit: "" }
    : formatDifficulty(blockDagInfo?.difficulty ?? 0);

  const circulatingSupply = (coinSupply?.circulatingSupply || 0) / 1_0000_0000;
  const minedPercent = (circulatingSupply / TOTAL_SUPPLY) * 100;
  const regularFee = feeEstimate ? (feeEstimate.normalBuckets[0].feerate * 2036) / 1_0000_0000 : 0;
  const regularFeeUsd = feeEstimate ? regularFee * (marketData?.price || 0) : 0;
  const mempoolSizeValue = Number(mempoolSize) || 0;
  const mempoolCapacity = 100000;
  const mempoolPercent = Math.min(100, (mempoolSizeValue / mempoolCapacity) * 100);

  return (
    <div className="flex w-full flex-col gap-y-6 text-black">
      <section className="flex w-full flex-col gap-6 rounded-4xl bg-white px-6 py-10 sm:px-10 sm:py-12">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <AnalyticsIcon className="h-10 w-10" />
            <h1 className="text-3xl font-semibold">Kaspa Analytics</h1>
          </div>
          <p className="text-gray-500">
            Live network pulse, issuance, fees, and block flow in one place. Everything updates as new blocks arrive.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Network hashrate</span>
              <FlashOn className="h-5 w-5 text-gray-400" />
            </div>
            <div className="mt-2 text-2xl font-semibold">
              {hashrateDisplay.value} <span className="text-base text-gray-500">{hashrateDisplay.unit}</span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-white">
              <div className="h-2 w-2/3 rounded-full bg-gray-200" />
            </div>
          </div>
          <div className="rounded-3xl bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Network difficulty</span>
              <BarChart className="h-5 w-5 text-gray-400" />
            </div>
            <div className="mt-2 text-2xl font-semibold">
              {difficultyDisplay.value} <span className="text-base text-gray-500">{difficultyDisplay.unit}</span>
            </div>
          </div>
          <div className="rounded-3xl bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Average block time</span>
              <Swap className="h-5 w-5 text-gray-400" />
            </div>
            <div className="mt-2 text-2xl font-semibold">
              {numeral(avgBlockTime).format("0.0")}
              <span className="text-base text-gray-500"> BPS</span>
            </div>
          </div>
          <div className="rounded-3xl bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Average transactions</span>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </div>
            <div className="mt-2 text-2xl font-semibold">
              {numeral(avgTxRate).format("0.0")} <span className="text-base text-gray-500">TPS</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-4xl bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Supply & issuance</h2>
            <Coins className="h-5 w-5 text-gray-400" />
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Circulating supply</span>
              <span className="font-medium">
                {isLoadingCoinSupply ? "--" : numeral(circulatingSupply).format("0,0")} KAS
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Mined</span>
              <span className="font-medium">{isLoadingCoinSupply ? "--" : numeral(minedPercent).format("0.00")}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-100">
              <div className="h-2 rounded-full bg-gray-300" style={{ width: `${Math.min(100, minedPercent)}%` }} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Block reward</span>
              <span className="font-medium">
                {isLoadingBlockReward ? "--" : numeral(blockReward?.blockreward || 0).format("0.000")} KAS
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Next reduction</span>
              <span className="font-medium">{isLoadingHalving ? "--" : halving?.nextHalvingDate || "--"}</span>
            </div>
          </div>
        </div>

        <div className="rounded-4xl bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Fees & mempool</h2>
            <Reward className="h-5 w-5 text-gray-400" />
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Regular fee</span>
              <span className="font-medium">
                {isLoadingFee ? "--" : numeral(regularFee).format("0.00000000")} KAS
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Regular fee (USD)</span>
              <span className="font-medium">
                {isLoadingFee ? "--" : numeral(regularFeeUsd).format("$0,0.00")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Mempool size</span>
              <span className="font-medium">{mempoolSize}</span>
            </div>
          </div>
        </div>

        <div className="rounded-4xl bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Mempool</h2>
            <PieChart className="h-5 w-5 text-gray-400" />
          </div>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Mempool size</span>
              <span className="font-medium">{mempoolSize}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-100">
              <div className="h-2 rounded-full bg-gray-300" style={{ width: `${mempoolPercent}%` }} />
            </div>
            <div className="text-xs text-gray-400">
              100% equals {numeral(mempoolCapacity).format("0,0")} transactions in mempool.
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-4xl bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Latest blocks</h2>
            <Box className="h-5 w-5 text-gray-400" />
          </div>
          <PageTable
            className="mt-4 text-black table-fixed w-full"
            headers={["Time", "Hash", "BlueScore", "TXs"]}
            additionalClassNames={{ 0: "w-24 whitespace-nowrap", 1: "overflow-hidden " }}
            rowClassName={(index) => (index % 2 === 1 ? "bg-gray-25" : "")}
            rows={blocks.slice(0, 8).map((block) => [
              dayjs(parseInt(block.timestamp)).format("HH:mm:ss"),
              <KasLink linkType="block" link to={block.block_hash} mono />,
              block.blueScore,
              block.txCount,
            ])}
          />
        </div>
        <div className="rounded-4xl bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Latest transactions</h2>
            <AnalyticsIcon className="h-5 w-5 text-gray-400" />
          </div>
          <PageTable
            className="mt-4 text-black table-fixed w-full"
            headers={["Time", "Transaction ID", "Amount"]}
            additionalClassNames={{ 0: "w-24 whitespace-nowrap", 1: "overflow-hidden ", 2: "whitespace-nowrap w-36" }}
            rowClassName={(index) => (index % 2 === 1 ? "bg-gray-25" : "")}
            rows={transactions.slice(0, 8).map((transaction) => [
              "a moment ago",
              <KasLink linkType="transaction" link to={transaction.txId} mono />,
              <>
                {numeral(transaction.outputs.reduce((acc, output) => acc + Number(output[1]), 0) / 1_0000_0000).format(
                  "0,0.[00]",
                )}
                <span className="text-gray-500 text-nowrap"> KAS</span>
              </>,
            ])}
          />
        </div>
      </section>
    </div>
  );
}
