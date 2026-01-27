import { Accepted, NotAccepted } from "../Accepted";
import Coinbase from "../Coinbase";
import IconMessageBox from "../IconMessageBox";
import KasLink from "../KasLink";
import PageSelector from "../PageSelector";
import PageTable from "../PageTable";
import Spinner from "../Spinner";
import Tooltip, { TooltipDisplayMode } from "../Tooltip";
import AccountBalanceWallet from "../assets/account_balance_wallet.svg";
import ArrowRight from "../assets/arrow-right.svg";
import Info from "../assets/info.svg";
import Kaspa from "../assets/kaspa.svg";
import { MarketDataContext } from "../context/MarketDataProvider";
import { useAddressBalance } from "../hooks/useAddressBalance";
import { useAddressTxCount } from "../hooks/useAddressTxCount";
import { useAddressUtxos } from "../hooks/useAddressUtxos";
import { useTransactions } from "../hooks/useTransactions";
import { useTransactionsSearch } from "../hooks/useTransactionsSearch";
import FooterHelper from "../layout/FooterHelper";
import { isValidKaspaAddressSyntax } from "../utils/kaspa";
import type { Route } from "./+types/addressdetails";
import dayjs from "dayjs";
import localeData from "dayjs/plugin/localeData";
import localizedFormat from "dayjs/plugin/localizedFormat";
import relativeTime from "dayjs/plugin/relativeTime";
import numeral from "numeral";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router";

dayjs().locale("en");
dayjs.extend(relativeTime);
dayjs.extend(localeData);
dayjs.extend(localizedFormat);

export async function loader({ params }: Route.LoaderArgs) {
  const address = params.address;

  if (!isValidKaspaAddressSyntax(address))
    throw new Response(`Kaspa address ${address} doesn't follow the kaspa address schema.`, { status: 400 });

  return { address };
}

export function meta({ params }: Route.LoaderArgs) {
  return [
    { title: `Kaspa Address ${params.address} | Kaspa Explorer` },
    {
      name: "description",
      content: "Check Kaspa address details. View transaction history, balance, and associated blocks.",
    },
    { name: "keywords", content: "Kaspa address, transactions, wallet balance, blockchain address lookup" },
  ];
}

export default function Addressdetails({ loaderData }: Route.ComponentProps) {
  const location = useLocation();
  const { data, isLoading: isLoadingAddressBalance, isFetching: isFetchingAddressBalance } =
    useAddressBalance(loaderData.address);
  const { data: utxoData, isLoading: isLoadingUtxoData } = useAddressUtxos(loaderData.address);
  const { data: txCount, isLoading: isLoadingTxCount } = useAddressTxCount(loaderData.address);
  const marketData = useContext(MarketDataContext);
  const [beforeAfter, setBeforeAfter] = useState<number[]>([0, 0]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [lastUpdated, setLastUpdated] = useState<string>("--");

  const [expand, setExpand] = useState<string[]>([]);

  useEffect(() => {
    setBeforeAfter([0, 0]); // Reset beforeAfter state
    setCurrentPage(1); // Reset currentPage state
  }, [loaderData.address]);

  const pageSize = 100;

  // fetch transactions with resolve_previous_outpoints set to "light"
  const { data: txData } = useTransactions(
    loaderData.address,
    pageSize,
    currentPage === 1 ? 0 : beforeAfter[0],
    currentPage === 1 ? 0 : beforeAfter[1],
    "",
    "light",
  );

  const pageChange = (page: number) => {
    // FIRST = 0,
    // LAST = 3,
    // PREVIOUS = 2,
    // NEXT = 1,
    if (page === 0) {
      setBeforeAfter([0, 0]);
      setCurrentPage(1);
    } else if (page === 1) {
      setBeforeAfter([txData?.nextBefore ?? 0, 0]);
      setCurrentPage((currentPage) => currentPage + 1);
    } else if (page === 2) {
      setBeforeAfter([0, txData?.nextAfter ?? 0]);
      setCurrentPage((currentPage) => currentPage - 1);
    } else if (page === 3) {
      setBeforeAfter([0, 1]);
      setCurrentPage(Math.ceil(txCount!.total / pageSize));
    }
  };

  const transactions = txData?.transactions || [];

  if (!loaderData.address) return;

  const isTabActive = (tab: string) => {
    const params = new URLSearchParams(location.search);
    if (tab === "transactions" && params.get("tab") === null) return true;
    return params.get("tab") === tab;
  };

  const txFilter = new URLSearchParams(location.search).get("tx") || "accepted";
  const filteredTransactions =
    isTabActive("transactions") && txFilter === "accepted"
      ? transactions.filter((transaction) => transaction.is_accepted)
      : transactions;
  const utxoTxIds = useMemo(() => {
    const ids = new Set<string>();
    (utxoData?.slice(0, 50) || []).forEach((utxo) => ids.add(utxo.outpoint.transactionId));
    return Array.from(ids);
  }, [utxoData]);

  const { data: utxoTxData } = useTransactionsSearch(
    utxoTxIds,
    "block_time,transaction_id",
    "no",
    isTabActive("utxos") && utxoTxIds.length > 0,
    60000,
  );
  const utxoTxTimeById = useMemo(
    () => new Map((utxoTxData || []).map((transaction) => [transaction.transaction_id, transaction.block_time])),
    [utxoTxData],
  );


  const balance = numeral((data?.balance || 0) / 1_0000_0000).format("0,0.00[000000]");
  const LoadingSpinner = () => <Spinner className="h-5 w-5" />;

  useEffect(() => {
    if (!isFetchingAddressBalance && !isLoadingAddressBalance) {
      setLastUpdated(new Date().toLocaleString());
    }
  }, [isFetchingAddressBalance, isLoadingAddressBalance, data]);

  return (
    <>
      <div className="relative flex w-full flex-col rounded-4xl bg-white p-4 text-left text-black sm:p-8">
        <div className="flex flex-row items-center text-2xl sm:col-span-2">
          <AccountBalanceWallet className="mr-2 h-8 w-8" />
          <span>Address details</span>
        </div>

        <span className="mt-4 mb-0">Balance</span>

        {!isLoadingAddressBalance ? (
          <span className="flex flex-row items-center text-[32px]">
            {balance.split(".")[0]}.<span className="self-end pb-[0.4rem] text-2xl">{balance.split(".")[1]}</span>
            <Kaspa className="fill-primary ml-1 h-8 w-8" />
          </span>
        ) : (
          <LoadingSpinner />
        )}
        {!isLoadingAddressBalance ? (
          <span className="ml-1 text-gray-500">
            {numeral(((data?.balance || 0) / 1_0000_0000) * (marketData?.price || 0)).format("$0,0.00")}
          </span>
        ) : (
          <LoadingSpinner />
        )}
        {/*horizontal rule*/}
        <div className={`my-4 h-[1px] bg-gray-100 sm:col-span-2`} />

        <div className="grid grid-cols-1 gap-x-14 gap-y-2 sm:grid-cols-[auto_1fr]">
          <FieldName name="Address" infoText="A unique Kaspa address used to send and receive funds." />
          <FieldValue value={<KasLink linkType="address" copy qr to={loaderData.address} />} />
          <FieldName name="Transactions" infoText="Total number of transactions involving this address." />
          <FieldValue value={!isLoadingTxCount ? numeral(txCount!.total).format("0,") : <LoadingSpinner />} />
          <FieldName name="UTXOs" infoText="Unspent, available outputs available at this address." />
          <FieldValue value={!isLoadingUtxoData ? numeral(utxoData!.length).format("0,") : <LoadingSpinner />} />
        </div>
      </div>
      <div className="my-2 text-center text-xs uppercase tracking-wide text-gray-400">
        Last updated: <span className="text-gray-500">{lastUpdated}</span>
      </div>

      <div className="flex w-full flex-col gap-x-18 gap-y-6 rounded-4xl bg-white p-4 text-left text-black sm:p-8">
        <div className="mr-auto flex w-auto flex-row items-center justify-around gap-x-1 rounded-full bg-gray-50 p-1 px-1">
          <NavLink
            to={`/addresses/${loaderData.address}?tab=transactions`}
            preventScrollReset={true}
            className={() =>
              `rounded-full px-4 py-1.5 hover:cursor-pointer hover:bg-white ${isTabActive("transactions") ? "bg-white" : ""}`
            }
          >
            Transactions
          </NavLink>
          <NavLink
            to={`/addresses/${loaderData.address}?tab=utxos`}
            preventScrollReset={true}
            className={() =>
              `rounded-full px-4 py-1.5 hover:cursor-pointer hover:bg-white ${isTabActive("utxos") ? "bg-white" : ""}`
            }
          >
            UTXOs
          </NavLink>
        </div>
        {isTabActive("transactions") && (
          <div className="ml-auto flex w-auto flex-row items-center justify-around gap-x-1 rounded-full bg-gray-50 p-1 px-1">
            <NavLink
              to={`/addresses/${loaderData.address}?tab=transactions&tx=all`}
              preventScrollReset={true}
              className={() =>
                `rounded-full px-4 py-1.5 hover:cursor-pointer hover:bg-white ${txFilter === "all" ? "bg-white" : ""}`
              }
            >
              All
            </NavLink>
            <NavLink
              to={`/addresses/${loaderData.address}?tab=transactions&tx=accepted`}
              preventScrollReset={true}
              className={() =>
                `rounded-full px-4 py-1.5 hover:cursor-pointer hover:bg-white ${txFilter === "accepted" ? "bg-white" : ""}`
              }
            >
              Accepted
            </NavLink>
          </div>
        )}

        {isTabActive("transactions") && (
          <div className="w-full">
            {filteredTransactions && filteredTransactions.length > 0 ? (
              <>
                <PageTable
                  alignTop
                  headers={["Timestamp", "ID", "From", "", "To", "Amount", "Status"]}
                  className="w-full md:text-sm lg:text-base"
                  additionalClassNames={{
                    2: "md:w-40 lg:w-50",
                    4: "md:w-40 lg:w-50",
                    3: "hidden md:table-cell",
                  }}
                  rows={(filteredTransactions || []).map((transaction) => [
                    <Tooltip
                      message={dayjs(transaction.block_time).format("MMM D, YYYY h:mm A")}
                      display={TooltipDisplayMode.Hover}
                    >
                      {dayjs(transaction.block_time).fromNow()}
                    </Tooltip>,
                    <KasLink shorten linkType="transaction" link to={transaction.transaction_id} mono />,
                    (transaction.inputs || []).length > 0 ? (
                      <ul className="leading-tight">
                        {(transaction.inputs || [])
                          .slice(0, expand.indexOf(transaction.transaction_id) === -1 ? 5 : undefined)
                          .map(
                            (input) =>
                              input.previous_outpoint_address && (
                                <li>
                                  <KasLink
                                    link={input.previous_outpoint_address !== loaderData.address}
                                    linkType="address"
                                    to={input.previous_outpoint_address}
                                    shorten
                                    resolveName
                                    mono
                                  />
                                </li>
                              ),
                          )}
                        {(transaction.inputs || []).length > 5 && expand.indexOf(transaction.transaction_id) === -1 && (
                          <span
                            className="text-link cursor-pointer hover:underline"
                            onClick={() => setExpand((expand) => expand.concat(transaction.transaction_id))}
                          >
                            Show more (+{transaction.inputs!.length - 5})
                          </span>
                        )}
                      </ul>
                    ) : (
                      <Coinbase />
                    ),
                    <ArrowRight className="inline h-4 w-4" />,
                    <ul className="leading-tight">
                      {(transaction.outputs || []).map((output) => (
                        <li>
                          <KasLink
                            linkType="address"
                            to={output.script_public_key_address}
                            link={loaderData.address !== output.script_public_key_address}
                            shorten
                            resolveName
                            mono
                          />
                        </li>
                      ))}
                    </ul>,
                    (() => {
                      const kasAmount =
                        ((transaction.inputs || []).reduce(
                          (acc, input) =>
                            acc -
                            (loaderData.address === (input.previous_outpoint_address || "")
                              ? input.previous_outpoint_amount || 0
                              : 0),
                          0,
                        ) +
                          (transaction.outputs || []).reduce(
                            (acc, output) =>
                              acc + (loaderData.address === output.script_public_key_address ? output.amount : 0),
                            0,
                          )) /
                        1_0000_0000;
                      const usdValue = kasAmount * (marketData?.price || 0);
                      return (
                        <>
                          <div>
                            {numeral(kasAmount).format("+0,0.00[000000]")}
                            <span className="text-gray-500 text-nowrap"> KAS</span>
                          </div>
                          <div className="text-xs text-gray-500">{numeral(usdValue).format("$0,0.00[00]")}</div>
                        </>
                      );
                    })(),
                    <span className="text-sm">{transaction.is_accepted ? <Accepted /> : <NotAccepted />}</span>,
                  ])}
                />
                <div className="ms-auto me-5 flex flex-row justify-center items-center">
                  {!isLoadingTxCount && (
                    <PageSelector
                      currentPage={currentPage}
                      totalPages={Math.ceil(txCount!.total / pageSize)}
                      onPageChange={pageChange}
                    />
                  )}
                </div>
              </>
            ) : (
              <IconMessageBox
                icon="data"
                title="No Transactions"
                description="This address doesn't have any transactions at the moment."
              />
            )}
          </div>
        )}

        {isTabActive("utxos") && (
          <>
            {(utxoData?.length ?? 0) > 0 ? (
              <>
                <PageTable
                  rows={(utxoData?.slice(0, 50) || []).map((utxo) => [
                    utxoTxTimeById.has(utxo.outpoint.transactionId) ? (
                      <Tooltip
                        message={dayjs(utxoTxTimeById.get(utxo.outpoint.transactionId) as number).format(
                          "MMM D, YYYY h:mm A",
                        )}
                        display={TooltipDisplayMode.Hover}
                      >
                        {dayjs(utxoTxTimeById.get(utxo.outpoint.transactionId) as number).fromNow()}
                      </Tooltip>
                    ) : (
                      "--"
                    ),
                    utxo.utxoEntry.blockDaaScore,
                    <KasLink linkType="transaction" to={utxo.outpoint.transactionId} link />,
                    utxo.outpoint.index,
                    numeral(parseFloat(utxo.utxoEntry.amount) / 1_0000_0000).format("0,0.00[000000]") + " KAS",
                  ])}
                  headers={["Timestamp", "Block DAA Score", "Transaction ID", "Index", "Amount"]}
                />
                {utxoData?.slice(0, 50).length === 50 && (
                  <div className="me-auto ms-auto">
                    There are more than 50 UTXOs for this address, which are not displayed.
                  </div>
                )}
              </>
            ) : (
              <IconMessageBox
                icon="data"
                title="No UTXOs"
                description="This address doesn't have any UTXOs at the moment."
              />
            )}
          </>
        )}
      </div>
      <FooterHelper icon={AccountBalanceWallet}>
        <span className="">
          An address is a unique identifier on the blockchain used to send, receive, and store assets or data. It holds
          balances and interacts with the network securely.
        </span>
      </FooterHelper>
    </>
  );
}

const FieldName = ({ name, infoText }: { name: string; infoText?: string }) => (
  <div className="flex flex-row items-start fill-gray-500 text-gray-500 sm:col-start-1">
    <div className="flex flex-row items-center">
      <Tooltip message={infoText || ""} display={TooltipDisplayMode.Hover} multiLine>
        <Info className="h-4 w-4" />
      </Tooltip>
      <span className="ms-1">{name}</span>
    </div>
  </div>
);

const FieldValue = ({ value }: { value: string | React.ReactNode }) => <span>{value}</span>;
