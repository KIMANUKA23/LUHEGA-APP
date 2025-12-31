import AsyncStorage from '@react-native-async-storage/async-storage';

const RECEIPT_SETTINGS_KEY = 'luhega_receipt_settings';

export type ReceiptSettings = {
    showStoreInfo: boolean;
    showTaxInfo: boolean;
    showPaymentDetails: boolean;
    showCustomerInfo: boolean;
    printAutomatically: boolean;
    emailReceipt: boolean;
    storeName: string;
    storeAddress: string;
    storePhone: string;
    footerMessage: string;
};

export const DEFAULT_RECEIPT_SETTINGS: ReceiptSettings = {
    showStoreInfo: true,
    showTaxInfo: true,
    showPaymentDetails: true,
    showCustomerInfo: true,
    printAutomatically: false,
    emailReceipt: false,
    storeName: "LUHEGA Auto Parts",
    storeAddress: "Dar es Salaam, Tanzania",
    storePhone: "+255 700 000 000",
    footerMessage: "Thank you for your business!",
};

export async function getReceiptSettings(): Promise<ReceiptSettings> {
    try {
        const jsonValue = await AsyncStorage.getItem(RECEIPT_SETTINGS_KEY);
        return jsonValue != null ? { ...DEFAULT_RECEIPT_SETTINGS, ...JSON.parse(jsonValue) } : DEFAULT_RECEIPT_SETTINGS;
    } catch (e) {
        console.log('Error loading receipt settings:', e);
        return DEFAULT_RECEIPT_SETTINGS;
    }
}

export async function updateReceiptSettings(settings: ReceiptSettings): Promise<boolean> {
    try {
        const jsonValue = JSON.stringify(settings);
        await AsyncStorage.setItem(RECEIPT_SETTINGS_KEY, jsonValue);
        return true;
    } catch (e) {
        console.log('Error saving receipt settings:', e);
        return false;
    }
}
