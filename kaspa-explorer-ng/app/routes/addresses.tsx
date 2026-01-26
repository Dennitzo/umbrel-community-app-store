import KasLink from "../KasLink";
import LoadingMessage from "../LoadingMessage";
import PageTable from "../PageTable";
import AccountBalanceWallet from "../assets/account_balance_wallet.svg";
import { useCoinSupply } from "../hooks/useCoinSupply";
import { useTopAddresses } from "../hooks/useTopAddresses";
import Card from "../layout/Card";
import CardContainer from "../layout/CardContainer";
import FooterHelper from "../layout/FooterHelper";
import MainBox from "../layout/MainBox";
import numeral from "numeral";
import { useEffect, useState } from "react";

export function meta() {
  return [
    { title: "Kaspa Addresses List | Kaspa Explorer" },
    {
      name: "description",
      content: "Browse Kaspa addresses. Track balances, transaction history, and recent activity on the network.",
    },
    { name: "keywords", content: "Kaspa addresses, blockchain explorer, wallet, transaction history, balances" },
  ];
}

export default function Addresses() {
  const { data: topAddresses, isLoading } = useTopAddresses();
  const { data: coinSupply, isLoading: isLoadingSupply } = useCoinSupply();
  const [lastUpdated, setLastUpdated] = useState<string>("--");

  useEffect(() => {
    if (!isLoading && !isLoadingSupply && topAddresses && coinSupply) {
      setLastUpdated(new Date().toLocaleString());
    }
  }, [isLoading, isLoadingSupply, topAddresses, coinSupply]);

  if (isLoading || isLoadingSupply || !topAddresses || !coinSupply) {
    return <LoadingMessage>Loading addresses</LoadingMessage>;
  }

  const calculateSum = (top: number) => topAddresses.ranking.slice(0, top).reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <>
      <MainBox>
        <CardContainer title="Addresses">
          <Card
            title="Top 10 addresses"
            loading={isLoadingSupply}
            value={`${numeral((calculateSum(10) / (coinSupply!.circulatingSupply / 1_0000_0000)) * 100).format("0.00")}%`}
            subtext="of circulating supply"
          />
          <Card
            title="Top 100 addresses"
            loading={isLoadingSupply}
            value={`${numeral((calculateSum(100) / (coinSupply!.circulatingSupply / 1_0000_0000)) * 100).format("0.00")}%`}
            subtext="of circulating supply"
          />
          <Card
            title="Top 1000 addresses"
            loading={isLoadingSupply}
            value={`${numeral((calculateSum(1000) / (coinSupply!.circulatingSupply / 1_0000_0000)) * 100).format("0.00")}%`}
            subtext="of circulating supply"
          />
        </CardContainer>
      </MainBox>

      <div className="flex w-full flex-col rounded-4xl bg-white p-4 text-left text-gray-500 sm:p-8">
        <PageTable
          className="text-black"
          headers={["Rank", "Address", "Balance", "Percentage"]}
          rows={topAddresses.ranking.slice(0, 100).map((addressInfo) => [
            addressInfo.rank + 1,
            <KasLink linkType="address" link to={addressInfo.address} mono />,
            <span className="text-nowrap">
              {numeral(addressInfo.amount).format("0,0")}
              <span className="text-gray-500 text-nowrap"> KAS</span>
            </span>,
            <>
              {numeral((addressInfo.amount / (coinSupply!.circulatingSupply / 1_0000_0000)) * 100).format("0.00")}
              <span className="text-gray-500">&nbsp;%</span>
            </>,
          ])}
        />
      </div>
      <div className="mt-3 text-xs uppercase tracking-wide text-gray-400">
        Last updated: <span className="text-gray-500">{lastUpdated}</span>
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
