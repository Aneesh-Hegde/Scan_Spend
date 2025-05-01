"use client";
import { useEffect, useState } from "react";
import { Metadata } from "grpc-web";
import { BalanceServiceClient } from "../grpc_schema/BalanceServiceClientPb";
import {
  Balance,
  GetBalanceRequest,
  GetBalanceResponse,
  AddBalanceSourceRequest,
  AddBalanceSourceResponse,
  UpdateBalanceRequest,
  UpdateBalanceResponse,
} from "../grpc_schema/balance_pb";
import api from "../utils/api";

const balanceClient = new BalanceServiceClient("http://localhost:8080", null, {
  withCredentials: true,
});

export default function Balances() {
  const [balances, setBalances] = useState<any[]>([]);
  const [balanceSources, setBalanceSources] = useState<any[]>([]); // Storing both balanceSource and accountId
  const [error, setError] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState("");
  const [customSourceName, setCustomSourceName] = useState("");
  const [initialAmount, setInitialAmount] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBalances();
  }, []);

  const fetchBalances = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    if (!token) {
      setError("No authentication token found");
      setLoading(false);
      return;
    }

    try {
      const response = await api.get("/get-refresh-token", { withCredentials: true });
      const refresh_token: string = response.data.refresh_token;
      const metadata: Metadata = { authentication: `Bearer ${token}`, refresh_token };

      const balanceRequest = new GetBalanceRequest();
      balanceClient.getBalances(balanceRequest, metadata, (err, balanceResponse: GetBalanceResponse) => {
        if (err) {
          setError(`Failed to fetch balances: ${err.message}`);
          setLoading(false);
          return;
        }

        const balanceList = balanceResponse.getBalanceList().map((b: Balance) => ({
          balanceId: b.getBalanceId(),
          userId: b.getUserId(),
          balanceSource: b.getBalanceSource(),
          amount: b.getBalance(),
        }));
        console.log(balanceList)

        setBalances(balanceList); // Store balance data
        // Get unique balance sources with associated accountIds
        const sources = balanceList
          .map((b) => ({ balanceSource: b.balanceSource, accountId: b.balanceId })) // Extract source and accountId
          .filter(
            (value, index, self) =>
              index === self.findIndex((v) => v.balanceSource === value.balanceSource) // Keep only distinct sources
          );

        setBalanceSources(sources); // Store distinct sources with accountId
        setError(null);
        setLoading(false);
      });
    } catch (err) {
      setError(`Failed to refresh token: ${err}`);
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedSource("");
    setCustomSourceName("");
    setInitialAmount("");
  };

  const handleAddOrUpdate = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    const isCustom = selectedSource === "__custom__";
    const sourceName = isCustom ? customSourceName.trim() : selectedSource;

    if (!token || !sourceName || !initialAmount) {
      setError("Missing token, source name, or amount");
      setLoading(false);
      return;
    }

    try {
      const response = await api.get("/get-refresh-token", { withCredentials: true });
      const refresh_token: string = response.data.refresh_token;
      const metadata: Metadata = { authentication: `Bearer ${token}`, refresh_token };

      if (!isCustom) {
        const existingSource = balanceSources.find((source) => source.balanceSource === sourceName);
        if (!existingSource) {
          setError("Selected balance source not found");
          setLoading(false);
          return;
        }

        const request = new UpdateBalanceRequest();
        console.log(balanceSources)
        request.setBalanceId(existingSource.accountId);
        request.setAmount(parseFloat(initialAmount));

        balanceClient.updateBalance(request, metadata, (err, response: UpdateBalanceResponse) => {
          if (err) {
            setError(`Failed to update balance: ${err.message}`);
            setLoading(false);
            return;
          }

          const updatedBalance = response.getBalance(); // Only contains the updated balance amount
          console.log(updatedBalance)

          setBalances((prev) =>
            prev.map((b) =>
              b.balanceId === existingSource.accountId
                ? { ...b, amount: updatedBalance?.getBalance() } // Update only the amount using the accountId
                : b
            )
          );
          resetForm();
          setLoading(false);
        });
      } else {
        const request = new AddBalanceSourceRequest();
        request.setBalanceSource(sourceName);
        request.setInitialAmount(parseFloat(initialAmount));

        balanceClient.addBalanceSource(request, metadata, (err, response: AddBalanceSourceResponse) => {
          if (err) {
            setError(`Failed to add balance: ${err.message}`);
            setLoading(false);
            return;
          }

          const newBalance = response.getBalance();
          if (newBalance) {
            setBalances((prev) => [
              ...prev,
              {
                balanceId: newBalance.getBalanceId(),
                userId: newBalance.getUserId(),
                balanceSource: sourceName,
                amount: newBalance.getBalance(),
              },
            ]);

            if (!balanceSources.some((source) => source.balanceSource === sourceName)) {
              setBalanceSources((prev) => [
                ...prev,
                { balanceSource: sourceName, accountId: newBalance.getBalanceId() }, // Add new source with accountId
              ]);
            }
          }

          resetForm();
          setLoading(false);
        });
      }
    } catch (err) {
      setError(`Failed to refresh token: ${err}`);
      setLoading(false);
    }
  };

  const handleSourceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedSource(value);
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>Balances</h1>
      {loading && <p style={{ color: "blue" }}>Loading...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      <ul>
        {balances.map((b) => (
          <li key={b.balanceId}>
            {b.balanceSource}: ${b.amount.toFixed(2)}
          </li>
        ))}
      </ul>

      <div style={{ marginTop: "20px" }}>
        <select value={selectedSource} onChange={handleSourceChange} style={{ marginRight: "10px" }}>
          <option value="">Select Balance Source</option>
          {balanceSources.map((item, index) => (
            <option key={index} value={item.balanceSource}>
              {item.balanceSource}
            </option>
          ))}
          <option value="__custom__">Add New Source</option>
        </select>

        {selectedSource === "__custom__" && (
          <input
            type="text"
            value={customSourceName}
            onChange={(e) => setCustomSourceName(e.target.value)}
            placeholder="Enter New Source"
            style={{ marginRight: "10px" }}
          />
        )}

        <input
          type="number"
          value={initialAmount}
          onChange={(e) => setInitialAmount(e.target.value)}
          placeholder="Amount"
          style={{ marginRight: "10px" }}
        />
        <button onClick={handleAddOrUpdate}>Save Balance</button>
      </div>
    </div>
  );
}

