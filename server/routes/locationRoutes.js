const express = require('express');
const router = express.Router();
const { getDistricts, getWards, getAllWards, getShippingFee } = require('../controllers/locationController');

// All location endpoints are public (used in forms)
router.get('/districts', getDistricts);
router.get('/wards', getAllWards);
router.get('/wards/:districtId', getWards);
router.get('/shipping-fee', getShippingFee);

module.exports = router;
