import axios from "axios";

const hitMikrotik  = async (url, method, body = null, headers = {}) => {
    try {
        const response = await axios({
            url,
            method,
            data: body,
            headers
        });
        return response.data;
    } catch (error) {
        console.error("Error hitting Mikrotik:", error);
        throw error;
    }
};

export { hitMikrotik };