// services/incomeService.ts
import { BalanceServiceClient } from '../grpc_schema/BalanceServiceClientPb';
import {
    GetIncomeRequest,
    AddIncomeSourceRequest,
    UpdateIncomeRequest,
    Income, // Import Income message for type definition
    GetIncomeResponse,
    AddIncomeSourceResponse,
    UpdateIncomeResponse,
} from '../grpc_schema/balance_pb';
import { Metadata } from 'grpc-web';
import Cookies from 'js-cookie';

const client = new BalanceServiceClient(process.env.NEXT_PUBLIC_GRPC_WEB_URL || 'http://localhost:8080');

const metadata = new Metadata();
const token = Cookies.get('token');
if (token) {
    metadata.set('Authorization', `Bearer ${token}`);
}

// Local interface representing a full income transaction,
// as received from GetIncomes and desired by UI components.
// Note: Not all fields can be sent in Add/Update requests with current proto.
interface IncomeLocal {
    id: number;
    source: string;
    amountDescription: string; // The string description of the amount
    amount: number;           // The numeric value of the income
    date: string;
}

// Helper to convert protobuf Income object to local IncomeLocal interface
const mapProtoIncomeToLocal = (protoIncome: Income): IncomeLocal => {
    return {
        id: protoIncome.getIncomeId(),
        source: protoIncome.getIncomeSource(),
        amountDescription: protoIncome.getIncomeAmount(),
        amount: protoIncome.getIncome(),
        date: protoIncome.getDate(),
    };
};

export const fetchIncomes = (): Promise<IncomeLocal[]> => {
    return new Promise((resolve, reject) => {
        const request = new GetIncomeRequest();
        client.getIncomes(request, metadata, (err: any, response: GetIncomeResponse | null) => {
            if (err) {
                console.error('Error fetching incomes:', err);
                reject(err);
                return;
            }
            if (response) {
                const incomes = response.getIncomeList().map(mapProtoIncomeToLocal);
                resolve(incomes);
            } else {
                resolve([]);
            }
        });
    });
};

/**
 * Adds a new income source.
 * IMPORTANT: With the current proto, this only sends 'source' and 'amount' (as initial_amount).
 * 'amountDescription' and 'date' from your UI cannot be sent via this RPC.
 */
export const addIncome = (newIncomeData: { source: string; amount: number }): Promise<IncomeLocal> => {
    return new Promise((resolve, reject) => {
        const request = new AddIncomeSourceRequest();
        request.setIncomeSource(newIncomeData.source);
        request.setInitialAmount(newIncomeData.amount);

        client.addIncomeSource(request, metadata, (err: any, response: AddIncomeSourceResponse | null) => {
            if (err) {
                console.error('Error adding income source:', err);
                reject(err);
                return;
            }
            if (response && response.getIncome()) {
                resolve(mapProtoIncomeToLocal(response.getIncome()));
            } else {
                reject(new Error("No income returned after adding income source."));
            }
        });
    });
};

/**
 * Updates an existing income.
 * IMPORTANT: With the current proto, this only sends 'id' and 'amount'.
 * 'source', 'amountDescription', and 'date' from your UI cannot be sent via this RPC.
 */
export const updateIncome = (updatedIncomeData: { id: number; amount: number }): Promise<IncomeLocal> => {
    return new Promise((resolve, reject) => {
        const request = new UpdateIncomeRequest();
        request.setIncomeId(updatedIncomeData.id);
        request.setAmount(updatedIncomeData.amount);

        client.updateIncome(request, metadata, (err: any, response: UpdateIncomeResponse | null) => {
            if (err) {
                console.error('Error updating income:', err);
                reject(err);
                return;
            }
            if (response && response.getIncome()) {
                resolve(mapProtoIncomeToLocal(response.getIncome()));
            } else {
                reject(new Error("No income returned after updating income."));
            }
        });
    });
};
