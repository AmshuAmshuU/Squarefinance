import apiHandler from "./api";

const API_ROOT = "/api/approvals";

export const getPendingApprovals = async (options = {}) => {
    try {
        const response = await apiHandler(`${API_ROOT}/pending`, {
            method: "GET",
            ...options,
        });
        return response;
    } catch (error) {
        throw error;
    }
};

export const processApproval = async (id, status, remarks) => {
    try {
        const response = await apiHandler(`${API_ROOT}/process/${id}`, {
            method: "POST",
            body: JSON.stringify({ status, remarks }),
        });
        return response;
    } catch (error) {
        throw error;
    }
};
