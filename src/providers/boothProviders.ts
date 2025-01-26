import { Provider } from "@elizaos/core";
import { JWT } from "google-auth-library";
import { GoogleSpreadsheet } from "google-spreadsheet";

const SPREADSHEET_ID = process.env.BOOTH_SPREADSHEET_ID;
const SHEET_ID = process.env.BOOTH_SHEET_ID;
const GOOGLE_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;

export const boothProvider: Provider = {
    get: async () => {
        const startTime = performance.now();

        try {
            const auth = new JWT({
                email: GOOGLE_EMAIL,
                key: GOOGLE_PRIVATE_KEY,
                scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
            });

            const doc = new GoogleSpreadsheet(SPREADSHEET_ID, auth);
            await doc.loadInfo();

            const sheet = doc.sheetsById[SHEET_ID];
            const rows = await sheet.getRows();

            const boothData = rows.map(row => ({
                companyName: row.get('Company Name'),
                level: row.get('Level'),
                boothNumber: row.get('Booth Number')
            }));

            const output = ['Booth Assignments (company name, level, booth)'];
            boothData.forEach(booth => {
                output.push(`- ${booth.companyName}, ${booth.level}, ${booth.boothNumber}`);
            });

            return output.join('\n');
        } catch (error) {
            const endTime = performance.now();
            console.log(`Booth data fetch failed after ${((endTime - startTime) / 1000).toFixed(2)} seconds`);
            console.error('Error reading spreadsheet:', error);
            throw error;
        }
    }
};