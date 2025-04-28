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
  const [error, setError] = useState<string | null>(null);
  const [newSource, setNewSource] = useState("");
  const [newAmount, setNewAmount] = useState("");
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

      const request = new GetBalanceRequest();
      balanceClient.getBalances(request, metadata, (err, response: GetBalanceResponse) => {
        if (err) {
          setError(`Failed to fetch balances: ${err.message}`);
          setLoading(false);
          return;
        }
        const balanceList = response.getBalanceList().map((b: Balance) => ({
          balanceId: b.getBalanceId(),
          userId: b.getUserId(),
          balanceSource: b.getBalanceSource(),
          amount: b.getBalance(),
        }));
        setBalances(balanceList);
        setError(null);
        setLoading(false);
      }).on("metadata", (metadata: any) => {
        const token: string | null = metadata["token"];
        if (token) {
          localStorage.setItem("token", token);
        }
      });
    } catch (err) {
      setError(`Failed to refresh token: ${err}`);
      setLoading(false);
    }
  };

  const addBalanceSource = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    if (!token || !newSource || !newAmount) {
      setError("Missing token, source, or amount");
      setLoading(false);
      return;
    }

    try {
      const response = await api.get("/get-refresh-token", { withCredentials: true });
      const refresh_token: string = response.data.refresh_token;
      const metadata: Metadata = { authentication: `Bearer ${token}`, refresh_token };

      const request = new AddBalanceSourceRequest();
      request.setBalanceSource(newSource);
      request.setInitialAmount(parseFloat(newAmount));

      balanceClient.addBalanceSource(request, metadata, (err, response: AddBalanceSourceResponse) => {
        if (err) {
          setError(`Failed to add balance: ${err.message}`);
          setLoading(false);
          return;
        }
        // Update state with the new balance directly
        const newBalance = response.getBalance();
        if (!newBalance) {
          setError("No balance returned from server");
          setLoading(false);
          return;
        }
        setBalances((prevBalances) => [
          ...prevBalances,
          {
            balanceId: newBalance.getBalanceId(),
            userId: newBalance.getUserId(),
            balanceSource: newSource,
            amount: newBalance.getBalance(),
          },
        ]);
        setNewSource("");
        setNewAmount("");
        setLoading(false);
      }).on("metadata", (metadata: any) => {
        const token: string | null = metadata["token"];
        if (token) {
          localStorage.setItem("token", token);
        }
      });
    } catch (err) {
      setError(`Failed to refresh token: ${err}`);
      setLoading(false);
    }
  };

  const updateBalance = async (balanceId: number) => {
    setLoading(true);
    const token = localStorage.getItem("token");
    if (!token) {
      setError("No authentication token found");
      setLoading(false);
      return;
    }

    const newAmount = prompt("Enter new amount:");
    if (!newAmount) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get("/get-refresh-token", { withCredentials: true });
      const refresh_token: string = response.data.refresh_token;
      const metadata: Metadata = { authentication: `Bearer ${token}`, refresh_token };

      const request = new UpdateBalanceRequest();
      request.setBalanceId(balanceId);
      request.setAmount(parseFloat(newAmount));

      balanceClient.updateBalance(request, metadata, (err, response: UpdateBalanceResponse) => {
        if (err) {
          setError(`Failed to update balance: ${err.message}`);
          setLoading(false);
          return;
        }
        // Update state with the updated balance directly
        const updatedBalance = response.getBalance();
        if (!updatedBalance) {
          setError("No balance returned from server");
          setLoading(false);
          return;
        }
        setBalances((prevBalances) =>
          prevBalances.map((b) =>
            b.balanceId === updatedBalance.getBalanceId()
              ? {
                  balanceId: updatedBalance.getBalanceId(),
                  userId: updatedBalance.getUserId(),
                  balanceSource: b.balanceSource,
                  amount: updatedBalance.getBalance(),
                }
              : b
          )
        );
        setLoading(false);
      }).on("metadata", (metadata: any) => {
        const token: string | null = metadata["token"];
        if (token) {
          localStorage.setItem("token", token);
        }
      });
    } catch (err) {
      setError(`Failed to refresh token: ${err}`);
      setLoading(false);
    }
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
            <button
              onClick={() => updateBalance(b.balanceId)}
              style={{ marginLeft: "10px" }}
            >
              Update
            </button>
          </li>
        ))}
      </ul>
      <div>
        <input
          type="text"
          value={newSource}
          onChange={(e) => setNewSource(e.target.value)}
          placeholder="Balance Source"
          style={{ marginRight: "10px" }}
        />
        <input
          type="number"
          value={newAmount}
          onChange={(e) => setNewAmount(e.target.value)}
          placeholder="Initial Amount"
          style={{ marginRight: "10px" }}
        />
        <button onClick={addBalanceSource}>Add Balance</button>
      </div>
    </div>
  );
}
