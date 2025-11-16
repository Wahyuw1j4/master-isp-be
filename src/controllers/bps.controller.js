
import { BaseController } from './controller.js';
import axios from 'axios';

const BPS_BASE_URL = 'https://sig.bps.go.id/rest-bridging/getwilayah';

class BpsController extends BaseController {
    getProvinsi = async (req, res, next) => {
        try {
            const r = await axios.get(`${BPS_BASE_URL}?level=provinsi`);
            this.sendResponse(res, 200, "success retrived response", r.data);
        } catch (err) {
            next(err);
        }
    }

    getKota = async (req, res, next) => {
        const { provinceCode } = req.query; // ex: '33'
        if (!provinceCode) {
            return res.status(400).json({ message: 'provinceCode query param wajib diisi' });
        }

        try {
            const r = await axios.get(
                `${BPS_BASE_URL}?level=kabupaten&parent=${encodeURIComponent(provinceCode)}`
            );
            this.sendResponse(res, 200, "success retrived response", r.data);
        } catch (err) {
            next(err);
        }
    }

    getKecamatan = async (req, res, next) => {
        const { regencyCode } = req.query;
        if (!regencyCode) {
            return res.status(400).json({ message: 'regencyCode query param wajib diisi' });
        }

        try {
            const r = await axios.get(
                `${BPS_BASE_URL}?level=kecamatan&parent=${encodeURIComponent(regencyCode)}`
            );
            this.sendResponse(res, 200, "success retrived response", r.data);
        } catch (err) {
            next(err);
        }
    }

    getKelurahan = async (req, res, next) => {
        const { districtCode } = req.query;
        if (!districtCode) {
            return res.status(400).json({ message: 'districtCode query param wajib diisi' });
        }

        try {
            const r = await axios.get(
                `${BPS_BASE_URL}?level=desa&parent=${encodeURIComponent(districtCode)}`
            );
            this.sendResponse(res, 200, "success retrived response", r.data);
        } catch (err) {
            next(err);
        }
    }
}

const bpsController = new BpsController();
export default bpsController;