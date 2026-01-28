import { displayAcceptance } from "../Accepted";
import Coinbase from "../Coinbase";
import ErrorMessage from "../ErrorMessage";
import IconMessageBox from "../IconMessageBox";
import KasLink from "../KasLink";
import LoadingMessage from "../LoadingMessage";
import PageTable from "../PageTable";
import Tooltip, { TooltipDisplayMode } from "../Tooltip";
import InfoIcon from "../assets/info.svg";
import Kaspa from "../assets/kaspa.svg";
import Swap from "../assets/swap.svg";
import Transaction from "../assets/transaction.svg";
import { MarketDataContext } from "../context/MarketDataProvider";
import { useTransactionById } from "../hooks/useTransactionById";
import { useTransactionCount } from "../hooks/useTransactionCount";
import { useVirtualChainBlueScore } from "../hooks/useVirtualChainBlueScore";
import FooterHelper from "../layout/FooterHelper";
import type { Route } from "./+types/transactiondetails";
import dayjs from "dayjs";
import localeData from "dayjs/plugin/localeData";
import localizedFormat from "dayjs/plugin/localizedFormat";
import relativeTime from "dayjs/plugin/relativeTime";
import numeral from "numeral";
import { useContext, useState } from "react";
import { NavLink, useLocation } from "react-router";

dayjs().locale("en");
dayjs.extend(relativeTime);
dayjs.extend(localeData);
dayjs.extend(localizedFormat);

export async function loader({ params }: Route.LoaderArgs) {
  const transactionId = params.transactionId as string;
  return { transactionId };
}

export function meta({ params }: Route.LoaderArgs) {
  return [
    { title: `Kaspa Transaction ${params.transactionId} | Kaspa Explorer` },
    {
      name: "description",
      content: "Explore Kaspa transaction. View sender, recipient, amount, status, and associated blocks and more.",
    },
    {
      name: "keywords",
      content: "Kaspa transaction, transaction ID, blockchain transfer, sender, receiver, transaction status",
    },
  ];
}

export default function TransactionDetails({ loaderData }: Route.ComponentProps) {
  const location = useLocation();
  const isTabActive = (tab: string) => (new URLSearchParams(location.search).get("tab") || "general") === tab;
  const { virtualChainBlueScore } = useVirtualChainBlueScore();

  const { data: transaction, isLoading, isError } = useTransactionById(loaderData.transactionId);
  const marketData = useContext(MarketDataContext);

  if (isLoading) {
    return <LoadingMessage>Fetching transaction details...</LoadingMessage>;
  }

  // type guard transaction
  if (isError || !transaction) {
    return (
      <ErrorMessage>
        The requested transaction could not be found. Please verify the transaction ID and try again.
      </ErrorMessage>
    );
  }

  const confirmations = (virtualChainBlueScore ?? 0) - (transaction?.accepting_block_blue_score || 0);
  const transactionSum = (transaction.outputs || []).reduce((sum, output) => sum + output.amount, 0);
  const displayKAS = (x: number) => numeral((x || 0) / 1_0000_0000).format("0,0.00[000000]");
  const displaySum = displayKAS(transactionSum);
  const inputSum = transaction?.inputs?.reduce((sum, input) => sum + input.previous_outpoint_amount, 0) || 0;
  const feeAmountAtomic = Math.max(0, inputSum - transactionSum);
  const outputPercent = inputSum > 0 ? (transactionSum / inputSum) * 100 : 0;
  const feePercent = inputSum > 0 ? (feeAmountAtomic / inputSum) * 100 : 0;
  const outputTooltip = `Outputs: ${displayKAS(transactionSum)} KAS (${numeral(outputPercent).format("0.00")}%)`;
  const feeTooltip = `Fee: ${displayKAS(feeAmountAtomic)} KAS (${numeral(feePercent).format("0.00")}%)`;
  const inputItems = (transaction.inputs || []).slice(0, 20).map((input) => ({
    address: input.previous_outpoint_address,
    amount: input.previous_outpoint_amount || 0,
  }));
  const outputItems = (transaction.outputs || []).slice(0, 20).map((output) => ({
    address: output.script_public_key_address,
    amount: output.amount || 0,
  }));
  const outputNodes = [...outputItems, { address: "Fee", amount: feeAmountAtomic, isFee: true }].filter(
    (item) => item.amount > 0
  );
  const [graphMode, setGraphMode] = useState<"minimal" | "detailed">("minimal");
  const isDetailed = graphMode === "detailed";
  const inputGraphItems = isDetailed ? inputItems : [{ address: "Inputs", amount: inputSum }];
  const outputGraphItems = isDetailed
    ? outputNodes
    : [
        { address: "Outputs", amount: transactionSum },
        { address: "Fee", amount: feeAmountAtomic, isFee: true },
      ].filter((item) => item.amount > 0);
  const inputCount = inputGraphItems.length || 1;
  const outputCount = outputGraphItems.length || 1;
  const flowTop = 30;
  const flowBottom = 210;
  const yFor = (index: number, count: number) =>
    count === 1 ? (flowTop + flowBottom) / 2 : flowTop + (flowBottom - flowTop) * (index / (count - 1));
  const strokeFor = (amount: number, total: number, min: number, max: number) =>
    total > 0 ? Math.max(min, max * (amount / total)) : min;

  const blockTime = dayjs(transaction?.block_time);

  const fee = (inputSum - transactionSum) / 1_0000_0000;

  return (
    <>
      <div className="flex w-full flex-col rounded-4xl bg-white p-4 text-left text-black sm:p-8">
        <div className="flex flex-row items-center text-2xl sm:col-span-2">
          <Swap className="mr-2 h-8 w-8" />
          <span>Transaction details</span>
        </div>

        <span className="mt-4 mb-0">Transfer details</span>

        <span className="flex flex-row items-center text-[32px]">
          {displaySum.split(".")[0]}.<span className="self-end pb-[0.4rem] text-2xl">{displaySum.split(".")[1]}</span>
          <Kaspa className="fill-primary ml-1 h-8 w-8" />
        </span>
        <span className="ml-1 text-gray-500">
          {numeral(((transactionSum || 0) / 1_0000_0000) * (marketData?.price || 0)).format("$0,0.00")}
        </span>
        {/*horizontal rule*/}
        <div className={`my-4 h-[1px] bg-gray-100 sm:col-span-2`} />

        <div className="grid grid-cols-1 gap-x-14 gap-y-2 sm:grid-cols-[auto_1fr]">
          <FieldName name="From" infoText="The (input) address(es) that sent KAS in this transaction." />
          <FieldValue
            value={
              <ul>
                {transaction.inputs ? (
                  [...new Set(transaction.inputs.map((input) => input.previous_outpoint_address))].map((addr) => (
                    <li>
                      <KasLink linkType="address" copy link to={addr} />
                    </li>
                  ))
                ) : (
                  <li>
                    <Coinbase />
                  </li>
                )}
              </ul>
            }
          />
          <FieldName name="To" infoText="The (output) address(es) where the KAS in this transaction were sent to." />
          <FieldValue
            value={
              <ul>
                {transaction.outputs ? (
                  [...new Set(transaction.outputs.map((output) => output.script_public_key_address))].map((addr) => (
                    <li>
                      <KasLink linkType="address" copy link to={addr} resolveName />
                    </li>
                  ))
                ) : (
                  <span>No output addresses</span>
                )}
              </ul>
            }
          />
        </div>
      </div>

      {inputSum > 0 && (
        <div className="flex w-full flex-col rounded-4xl bg-white p-4 text-left text-black sm:p-8">
          <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center text-2xl">
              <Swap className="mr-2 h-8 w-8" />
              <span>Transaction flow</span>
            </div>
            <div className="flex w-auto flex-row items-center justify-around gap-x-1 rounded-full bg-gray-50 p-1 px-1 text-sm">
              <button
                type="button"
                onClick={() => setGraphMode("minimal")}
                className={`rounded-full px-4 py-1.5 hover:cursor-pointer hover:bg-white ${graphMode === "minimal" ? "bg-white" : ""}`}
              >
                Minimal graph
              </button>
              <button
                type="button"
                onClick={() => setGraphMode("detailed")}
                className={`rounded-full px-4 py-1.5 hover:cursor-pointer hover:bg-white ${graphMode === "detailed" ? "bg-white" : ""}`}
              >
                Detailed graph
              </button>
            </div>
          </div>

          <div className="relative mt-6 h-72 w-full">
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 240" preserveAspectRatio="none">
              <defs>
                <marker id="arrow-primary" viewBox="0 0 12 12" refX="8" refY="6" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M 0 0 L 12 6 L 0 12 z" fill="#70C7BA" />
                </marker>
                <marker id="arrow-fee" viewBox="0 0 12 12" refX="8" refY="6" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M 0 0 L 12 6 L 0 12 z" fill="#F4B860" />
                </marker>
              </defs>
              <rect x="470" y="108" width="60" height="24" rx="12" fill="#e5e7eb">
                <title>{`Total input: ${displayKAS(inputSum)} KAS`}</title>
              </rect>
              {inputGraphItems.map((input, index) => {
                const y = yFor(index, inputCount);
                const strokeWidth = strokeFor(input.amount, inputSum, 4, 16);
                return (
                  <path
                    key={`in-path-${index}`}
                    d={`M 120 ${y} C 260 ${y}, 360 120, 500 120`}
                    fill="none"
                    stroke="#b9e3dd"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    markerEnd="url(#arrow-primary)"
                  >
                    <title>{`Input: ${displayKAS(input.amount)} KAS • ${input.address}`}</title>
                  </path>
                );
              })}
              {outputGraphItems.map((output, index) => {
                const y = yFor(index, outputCount);
                const strokeWidth = strokeFor(output.amount, inputSum, 4, output.isFee ? 12 : 18);
                const strokeColor = output.isFee ? "#F4B860" : "#70C7BA";
                const marker = output.isFee ? "url(#arrow-fee)" : "url(#arrow-primary)";
                return (
                  <path
                    key={`out-path-${index}`}
                    d={`M 500 120 C 640 ${y}, 740 ${y}, 880 ${y}`}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    markerEnd={marker}
                  >
                    <title>{`${output.isFee ? "Fee" : "Output"}: ${displayKAS(output.amount)} KAS • ${output.address}`}</title>
                  </path>
                );
              })}
            </svg>

            <div className="absolute left-0 top-0 h-full w-full">
              {inputGraphItems.map((input, index) => {
                const y = yFor(index, inputCount);
                return (
                  <div key={`in-node-${index}`} className="absolute" style={{ left: "6%", top: `${(y / 240) * 100}%` }}>
                    <Tooltip
                      message={`Input: ${displayKAS(input.amount)} KAS • ${input.address}`}
                      display={TooltipDisplayMode.Hover}
                    >
                      <div className="h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-[#70C7BA] shadow-sm" />
                    </Tooltip>
                  </div>
                );
              })}
              <div className="absolute" style={{ left: "50%", top: "50%" }}>
                <Tooltip message={`Total input: ${displayKAS(inputSum)} KAS`} display={TooltipDisplayMode.Hover}>
                  <div className="h-3 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gray-400 shadow-sm" />
                </Tooltip>
              </div>
              {outputGraphItems.map((output, index) => {
                const y = yFor(index, outputCount);
                return (
                  <div key={`out-node-${index}`} className="absolute" style={{ left: "94%", top: `${(y / 240) * 100}%` }}>
                    <Tooltip
                      message={`${output.isFee ? "Fee" : "Output"}: ${displayKAS(output.amount)} KAS • ${output.address}`}
                      display={TooltipDisplayMode.Hover}
                    >
                      <div
                        className={`h-2.5 w-5 -translate-y-1/2 rounded-full shadow-sm ${output.isFee ? "bg-[#F4B860]" : "bg-[#70C7BA]"}`}
                      />
                    </Tooltip>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="flex w-full flex-col gap-x-18 gap-y-6 rounded-4xl bg-white p-4 text-left text-black sm:p-8">
        <div className="mr-auto flex w-auto flex-row items-center justify-around gap-x-1 rounded-full bg-gray-50 p-1 px-1">
          <NavLink
            to={`/transactions/${loaderData.transactionId}?tab=general`}
            preventScrollReset={true}
            className={() =>
              `rounded-full px-4 py-1.5 hover:cursor-pointer hover:bg-white ${isTabActive("general") ? "bg-white" : ""}`
            }
          >
            General information
          </NavLink>
          <NavLink
            to={`/transactions/${loaderData.transactionId}?tab=inputs`}
            preventScrollReset={true}
            className={() =>
              `rounded-full px-4 py-1.5 hover:cursor-pointer hover:bg-white ${isTabActive("inputs") ? "bg-white" : ""}`
            }
          >
            Inputs
          </NavLink>
          <NavLink
            to={`/transactions/${loaderData.transactionId}?tab=outputs`}
            preventScrollReset={true}
            className={() =>
              `rounded-full px-4 py-1.5 hover:cursor-pointer hover:bg-white ${isTabActive("outputs") ? "bg-white" : ""}`
            }
          >
            Outputs
          </NavLink>
        </div>

        {isTabActive("general") && transaction && (
          <div className="grid w-full grid-cols-1 gap-x-18 gap-y-2 rounded-4xl bg-white text-left text-nowrap text-black sm:grid-cols-[auto_1fr]">
            <FieldName name="Transaction ID" infoText="The unique identifier of this transaction." />
            <FieldValue value={<KasLink copy to={transaction.transaction_id} linkType="transaction" />} />
            <FieldName
              name="Subnetwork ID"
              infoText="The Subnetwork ID is an identifier for transactions. It's used to group mining and regular transactions."
            />
            <FieldValue value={transaction.subnetwork_id} />
            <FieldName
              name="Status"
              infoText="Displays whether the transaction was accepted by the protocol and how many confirmations it has so far."
            />

            <FieldValue value={displayAcceptance(transaction.is_accepted, confirmations)} />
            {/*horizontal rule*/}
            <div className={`my-4 h-[1px] bg-gray-100 sm:col-span-2`} />
            <FieldName name="Hash" infoText="Hash calculated from the transaction data." />
            <FieldValue value={transaction.hash} />
            <FieldName
              name="Compute mass"
              infoText="The computed mass / weight of a transaction. It's used to determine the fee of a transaction."
            />

            <FieldValue value={inputSum === 0 ? 0 : transaction.mass} />
            {/*horizontal rule*/}
            <div className={`my-4 h-[1px] bg-gray-100 sm:col-span-2`} />
            <FieldName name="Block hashes" infoText="Blocks, in which this transaction was included." />
            <FieldValue
              value={transaction.block_hash.map((blockHash) => (
                <div>
                  <KasLink linkType="block" link to={blockHash} />
                </div>
              ))}
            />
            <FieldName name="Block time" infoText="Timestamp, when the transaction was included in a block." />
            <FieldValue
              value={
                <>
                  <div className="flex flex-col">
                    <span>{blockTime.fromNow()}</span>
                    <span className="text-gray-500">{blockTime.format("ll LTS")}</span>
                  </div>
                </>
              }
            />
            <FieldName
              name="Accepting block hash"
              infoText="Block hash of a chain block, which accepted this transaction."
            />
            <FieldValue
              value={
                transaction.accepting_block_hash ? (
                  <KasLink link linkType="block" to={transaction.accepting_block_hash} />
                ) : (
                  "Transaction is not accepted."
                )
              }
            />
            {transaction.payload && (
              <>
                <FieldName name="Payload" infoText="Payload data, which is used for miners to transmit miner's data." />
                <FieldValue
                  className="rounded-lg bg-gray-50 px-1 py-2 font-mono text-wrap break-all"
                  value={transaction.payload}
                />
              </>
            )}
            {(transaction.inputs || []).length > 0 && (
              <>
                <div className={`my-4 h-[1px] bg-gray-100 sm:col-span-2`} />
                <FieldName
                  name="Transaction fee"
                  infoText="Fee for this transaction which goes to miners as reward. It is the total output amount minus the total input amount."
                />
                <FieldValue
                  value={
                    <>
                      <span>{fee}</span>
                      <span className="text-gray-500 text-nowrap"> KAS</span>
                      <div className="text-gray-500">
                        {numeral((fee * (marketData?.price || 0)).toFixed(6)).format("$0,0.00[000000]")}
                      </div>
                    </>
                  }
                />
              </>
            )}
          </div>
        )}

        {isTabActive("inputs") && (
          <>
            {transaction.inputs && transaction.inputs.length > 0 ? (
              <div className="text-nowrap">
                <PageTable
                  rowClassName={(index) => (index % 2 === 1 ? "bg-gray-25" : "")}
                  rows={transaction.inputs.map((input) => {
                    return [
                      input.sig_op_count,
                      <span className="text-wrap">{input.signature_script}</span>,
                      <>
                        <KasLink linkType="transaction" link shorten to={input.previous_outpoint_hash} />
                        {` #${input.previous_outpoint_index}`}
                      </>,
                      <KasLink linkType="address" shorten link to={input.previous_outpoint_address} />,
                      <>
                        <span className="text-nowrap">
                          {displayKAS(input.previous_outpoint_amount).split(".")[0]}.
                          <span className="self-end pb-[0.4rem]">
                            {displayKAS(input.previous_outpoint_amount).split(".")[1]}
                          </span>
                        </span>
                        <span className="text-gray-500 text-nowrap"> KAS</span>
                      </>,
                    ];
                  })}
                  headers={[
                    "Sig Op Count",
                    "Signature Script",
                    <span className="text-nowrap">Outpoint ID & Index</span>,
                    "Outpoint Address",
                    "Amount",
                  ]}
                />
              </div>
            ) : (
              <div className="w-full flex flex-col items-center justify-center">
                <IconMessageBox icon="data" title="No inputs" description="This transaction has no inputs." />
              </div>
            )}
          </>
        )}

        {isTabActive("outputs") && transaction.outputs && transaction.outputs.length > 0 && (
          <PageTable
            headers={["Index", "Type", "Script Public Key", "Script Public Key Address", "Amount"]}
            rowClassName={(index) => (index % 2 === 1 ? "bg-gray-25" : "")}
            rows={transaction.outputs.map((output) => {
              return [
                output.index || "0",
                <span className="text-nowrap">{output.script_public_key_type}</span>,
                output.script_public_key,
                <KasLink linkType="address" to={output.script_public_key_address} link resolveName />,
                <span className="text-nowrap">
                  <span>
                    {displayKAS(output.amount).split(".")[0]}.
                    <span className="self-end pb-[0.4rem]">{displayKAS(output.amount).split(".")[1]}</span>
                  </span>
                  <span className="text-gray-500 text-nowrap"> KAS</span>
                </span>,
              ];
            })}
          />
        )}
      </div>
      <FooterHelper icon={Transaction}>
        A transaction is a cryptographically signed command that modifies the blockchain's state. Block explorers
        monitor and display the details of every transaction within the network.
      </FooterHelper>
    </>
  );
}

const FieldName = ({ name, infoText, className }: { name: string; infoText?: string; className?: string }) => (
  <div className={`flex flex-row items-start fill-gray-500 text-gray-500 sm:col-start-1 ${className ? className : ""}`}>
    <div className="flex flex-row items-center">
      <Tooltip message={infoText || ""} display={TooltipDisplayMode.Hover} multiLine>
        <InfoIcon className="h-4 w-4" />
      </Tooltip>
      <span className="ms-1">{name}</span>
    </div>
  </div>
);

const FieldValue = ({ value, className }: { value: string | React.ReactNode; className?: string }) => (
  <span className={`text-wrap break-all ${className}`}>{value}</span>
);
