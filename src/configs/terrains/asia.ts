import { CountrySettings } from 'src/app/country/countries';
import { UNIT_ID } from 'src/configs/unit-id';

/**
 * Asia terrain configuration
 * Generated from cities.txt and countries.txt
 */
export function SetCountriesAsia() {
	CountrySettings.push({
		name: 'Jordan',
		spawnerData: {
			unitData: { x: -16576.75, y: 3384.0 },
		},
		cities: [
			{ barrack: { x: -17408.0, y: 3520.0 } },
			{ barrack: { x: -16448.0, y: 4416.0 } },
		],
	});
	CountrySettings.push({
		name: 'Mozambique',
		spawnerData: {
			unitData: { x: -16582.5, y: -13508.5 },
		},
		cities: [
			{ barrack: { x: -17472.0, y: -13888.0 } },
			{ barrack: { x: -16448.0, y: -12736.0 } },
			{ barrack: { typeId: UNIT_ID.PORT, x: -16480.0, y: -15008.0 }, cityType: 'port' },
		],
	});
	CountrySettings.push({
		name: 'Tanzania',
		spawnerData: {
			unitData: { x: -16589.25, y: -10949.0 },
		},
		cities: [
			{ barrack: { x: -17152.0, y: -10304.0 } },
			{ barrack: { x: -16000.0, y: -11264.0 } },
		],
	});
	CountrySettings.push({
		name: 'Kenya',
		spawnerData: {
			unitData: { x: -16329.5, y: -8644.0 },
		},
		cities: [
			{ barrack: { x: -15488.0, y: -9152.0 } },
			{ barrack: { x: -17216.0, y: -8192.0 } },
		],
	});
	CountrySettings.push({
		name: 'Somalia',
		spawnerData: {
			unitData: { x: -12362.75, y: -6342.75 },
		},
		cities: [
			{ barrack: { typeId: UNIT_ID.PORT, x: -14016.0, y: -8640.0 }, cityType: 'port' },
			{ barrack: { x: -12800.0, y: -7488.0 } },
			{ barrack: { typeId: UNIT_ID.PORT, x: -11872.0, y: -5408.0 }, cityType: 'port' },
		],
	});
	CountrySettings.push({
		name: 'Taiwan',
		spawnerData: {
			unitData: { x: 10306.25, y: 1852.5 },
		},
		cities: [
			{ barrack: { typeId: UNIT_ID.PORT, x: 10528.0, y: 1056.0 }, cityType: 'port' },
			{ barrack: { x: 10624.0, y: 2688.0 } },
		],
	});
	CountrySettings.push({
		name: 'South Ethiopia',
		spawnerData: {
			unitData: { x: -15818.75, y: -6341.25 },
		},
		cities: [
			{ barrack: { x: -16192.0, y: -7104.0 } },
			{ barrack: { x: -14784.0, y: -6400.0 } },
			{ barrack: { x: -16960.0, y: -6016.0 } },
		],
	});
	CountrySettings.push({
		name: 'North Ethiopia',
		spawnerData: {
			unitData: { x: -15042.75, y: -4289.0 },
		},
		cities: [
			{ barrack: { x: -15424.0, y: -3264.0 } },
			{ barrack: { x: -16000.0, y: -4224.0 } },
			{ barrack: { x: -13856.0, y: -4896.0 } },
		],
	});
	CountrySettings.push({
		name: 'Sudan',
		spawnerData: {
			unitData: { x: -17098.5, y: -2884.0 },
		},
		cities: [
			{ barrack: { x: -17344.0, y: -3648.0 } },
			{ barrack: { x: -16384.0, y: -2112.0 } },
		],
	});
	CountrySettings.push({
		name: 'Saudi Arabia',
		spawnerData: {
			unitData: { x: -15046.25, y: 1210.0 },
		},
		cities: [
			{ barrack: { x: -15936.0, y: 1536.0 } },
			{ barrack: { x: -14848.0, y: 2112.0 } },
			{ barrack: { x: -13760.0, y: 256.0 } },
			{ barrack: { x: -15168.0, y: 448.0 } },
			{ barrack: { x: -14144.0, y: -896.0 } },
		],
	});
	CountrySettings.push({
		name: 'Iraq',
		spawnerData: {
			unitData: { x: -14795.75, y: 5563.0 },
		},
		cities: [
			{ barrack: { x: -15104.0, y: 4864.0 } },
			{ barrack: { x: -14528.0, y: 6336.0 } },
		],
	});
	CountrySettings.push({
		name: 'Syria',
		spawnerData: {
			unitData: { x: -16961.0, y: 5826.0 },
		},
		cities: [
			{ barrack: { x: -17344.0, y: 5184.0 } },
			{ barrack: { x: -16256.0, y: 6080.0 } },
		],
	});
	CountrySettings.push({
		name: 'Turkey',
		spawnerData: {
			unitData: { x: -16202.0, y: 8501.5 },
		},
		cities: [
			{ barrack: { x: -17472.0, y: 8448.0 } },
			{ barrack: { x: -16192.0, y: 7744.0 } },
			{ barrack: { x: -15104.0, y: 8640.0 } },
		],
	});
	CountrySettings.push({
		name: 'Georgia',
		spawnerData: {
			unitData: { x: -14271.0, y: 9541.0 },
		},
		cities: [
			{ barrack: { x: -14784.0, y: 10048.0 } },
			{ barrack: { x: -13760.0, y: 9344.0 } },
		],
	});
	CountrySettings.push({
		name: 'South Russia',
		spawnerData: {
			unitData: { x: -13761.25, y: 11970.25 },
		},
		cities: [
			{ barrack: { x: -12608.0, y: 11328.0 } },
			{ barrack: { x: -14848.0, y: 12224.0 } },
			{ barrack: { x: -14912.0, y: 14912.0 } },
			{ barrack: { x: -17024.0, y: 15744.0 } },
		],
	});
	CountrySettings.push({
		name: 'Ukraine',
		spawnerData: {
			unitData: { x: -17095.0, y: 13760.0 },
		},
		cities: [
			{ barrack: { x: -16320.0, y: 13824.0 } },
			{ barrack: { x: -17408.0, y: 13120.0 } },
		],
	});
	CountrySettings.push({
		name: 'East Malaysia',
		spawnerData: {
			unitData: { x: 9532.5, y: -8644.5 },
		},
		cities: [
			{ barrack: { x: 8128.0, y: -10752.0 } },
			{ barrack: { x: 10112.0, y: -8064.0 } },
			{ barrack: { typeId: UNIT_ID.PORT, x: 8736.0, y: -9120.0 }, cityType: 'port' },
		],
	});
	CountrySettings.push({
		name: 'Lower Indonesia',
		spawnerData: {
			unitData: { x: 7995.0, y: -15559.0 },
		},
		cities: [
			{ barrack: { typeId: UNIT_ID.PORT, x: 7136.0, y: -14944.0 }, cityType: 'port' },
			{ barrack: { x: 9216.0, y: -15424.0 } },
		],
	});
	CountrySettings.push({
		name: 'Bhutan',
		spawnerData: {
			unitData: { x: 56.5, y: 953.5 },
		},
		cities: [
			{ barrack: { x: 0.0, y: 1408.0 } },
		],
	});
	CountrySettings.push({
		name: 'Northeast India',
		spawnerData: {
			unitData: { x: 1342.0, y: 1212.75 },
		},
		cities: [
			{ barrack: { x: 1088.0, y: 576.0 } },
			{ barrack: { x: 1984.0, y: 1920.0 } },
		],
	});
	CountrySettings.push({
		name: 'Nepal',
		spawnerData: {
			unitData: { x: -1994.0, y: 1087.75 },
		},
		cities: [
			{ barrack: { x: -2432.0, y: 1664.0 } },
			{ barrack: { x: -1344.0, y: 1088.0 } },
		],
	});
	CountrySettings.push({
		name: 'Tibet',
		spawnerData: {
			unitData: { x: -1600.0, y: 3902.0 },
		},
		cities: [
			{ barrack: { x: 1664.0, y: 3392.0 } },
			{ barrack: { x: 192.0, y: 3712.0 } },
			{ barrack: { x: -1344.0, y: 3328.0 } },
			{ barrack: { x: -1152.0, y: 4928.0 } },
			{ barrack: { x: -2560.0, y: 4544.0 } },
		],
	});
	CountrySettings.push({
		name: 'West Malaysia',
		spawnerData: {
			unitData: { x: 4668.0, y: -9800.0 },
		},
		cities: [
			{ barrack: { x: 4288.0, y: -9152.0 } },
			{ barrack: { typeId: UNIT_ID.PORT, x: 5280.0, y: -10144.0 }, cityType: 'port' },
		],
	});
	CountrySettings.push({
		name: 'Yunnan',
		spawnerData: {
			unitData: { x: 3771.0, y: 55.75 },
		},
		cities: [
			{ barrack: { x: 3456.0, y: 1344.0 } },
			{ barrack: { x: 4608.0, y: 576.0 } },
		],
	});
	CountrySettings.push({
		name: 'South Korea',
		spawnerData: {
			unitData: { x: 10555.5, y: 9020.25 },
		},
		cities: [
			{ barrack: { x: 11072.0, y: 9728.0 } },
		],
	});
	CountrySettings.push({
		name: 'North Korea',
		spawnerData: {
			unitData: { x: 9656.75, y: 11199.0 },
		},
		cities: [
			{ barrack: { x: 9920.0, y: 10560.0 } },
			{ barrack: { typeId: UNIT_ID.PORT, x: 10240.0, y: 12352.0 }, cityType: 'port' },
		],
	});
	CountrySettings.push({
		name: 'Russia Far East',
		spawnerData: {
			unitData: { x: 9275.25, y: 15673.0 },
		},
		cities: [
			{ barrack: { x: 8576.0, y: 16064.0 } },
			{ barrack: { x: 10112.0, y: 16064.0 } },
		],
	});
	CountrySettings.push({
		name: 'Japan',
		spawnerData: {
			unitData: { x: 13501.0, y: 10550.5 },
		},
		cities: [
			{ barrack: { typeId: UNIT_ID.PORT, x: 12384.0, y: 7584.0 }, cityType: 'port' },
			{ barrack: { x: 12992.0, y: 9216.0 } },
			{ barrack: { x: 14144.0, y: 11136.0 } },
			{ barrack: { x: 13632.0, y: 13376.0 } },
		],
	});
	CountrySettings.push({
		name: 'Sapporo',
		spawnerData: {
			unitData: { x: 13369.5, y: 15293.25 },
		},
		cities: [
			{ barrack: { x: 13632.0, y: 16064.0 } },
			{ barrack: { typeId: UNIT_ID.PORT, x: 14496.0, y: 15584.0 }, cityType: 'port' },
		],
	});
	CountrySettings.push({
		name: 'North Philippines',
		spawnerData: {
			unitData: { x: 11192.25, y: -964.0 },
		},
		cities: [
			{ barrack: { typeId: UNIT_ID.PORT, x: 10848.0, y: -224.0 }, cityType: 'port' },
			{ barrack: { x: 11072.0, y: -1728.0 } },
		],
	});
	CountrySettings.push({
		name: 'South Philippines',
		spawnerData: {
			unitData: { x: 12984.5, y: -5321.75 },
		},
		cities: [
			{ barrack: { x: 13440.0, y: -4736.0 } },
			{ barrack: { typeId: UNIT_ID.PORT, x: 13216.0, y: -6048.0 }, cityType: 'port' },
		],
	});
	CountrySettings.push({
		name: 'Inner Mongolia',
		spawnerData: {
			unitData: { x: 3773.5, y: 7993.25 },
		},
		cities: [
			{ barrack: { x: 2816.0, y: 8384.0 } },
			{ barrack: { x: 4288.0, y: 8640.0 } },
			{ barrack: { x: 6016.0, y: 10432.0 } },
		],
	});
	CountrySettings.push({
		name: 'South Xinjiang',
		spawnerData: {
			unitData: { x: -3015.0, y: 6331.0 },
		},
		cities: [
			{ barrack: { x: -3584.0, y: 5760.0 } },
			{ barrack: { x: -2816.0, y: 6976.0 } },
			{ barrack: { x: -1920.0, y: 6016.0 } },
		],
	});
	CountrySettings.push({
		name: 'North Xinjiang',
		spawnerData: {
			unitData: { x: -712.75, y: 8504.0 },
		},
		cities: [
			{ barrack: { x: -1728.0, y: 8640.0 } },
			{ barrack: { x: -832.0, y: 9664.0 } },
			{ barrack: { x: 256.0, y: 8576.0 } },
			{ barrack: { x: -768.0, y: 7488.0 } },
		],
	});
	CountrySettings.push({
		name: 'Mongolia',
		spawnerData: {
			unitData: { x: 3646.25, y: 12086.5 },
		},
		cities: [
			{ barrack: { x: 5696.0, y: 12672.0 } },
			{ barrack: { x: 4352.0, y: 13184.0 } },
			{ barrack: { x: 2304.0, y: 12736.0 } },
			{ barrack: { x: 1088.0, y: 11584.0 } },
			{ barrack: { x: 1920.0, y: 10176.0 } },
			{ barrack: { x: 3840.0, y: 10496.0 } },
		],
	});
	CountrySettings.push({
		name: 'North China',
		spawnerData: {
			unitData: { x: 8250.0, y: 12865.0 },
		},
		cities: [
			{ barrack: { x: 8000.0, y: 11584.0 } },
			{ barrack: { x: 9024.0, y: 13248.0 } },
			{ barrack: { x: 7296.0, y: 13952.0 } },
			{ barrack: { typeId: UNIT_ID.PORT, x: 7456.0, y: 10144.0 }, cityType: 'port' },
		],
	});
	CountrySettings.push({
		name: 'Central China',
		spawnerData: {
			unitData: { x: 1719.5, y: 5690.25 },
		},
		cities: [
			{ barrack: { x: 1600.0, y: 4800.0 } },
			{ barrack: { x: 576.0, y: 6080.0 } },
			{ barrack: { x: 1792.0, y: 6528.0 } },
			{ barrack: { x: 2816.0, y: 5568.0 } },
		],
	});
	CountrySettings.push({
		name: 'South India',
		spawnerData: {
			unitData: { x: -4164.5, y: -4932.75 },
		},
		cities: [
			{ barrack: { x: -4864.0, y: -5888.0 } },
			{ barrack: { x: -3136.0, y: -5952.0 } },
			{ barrack: { x: -3968.0, y: -7296.0 } },
			{ barrack: { typeId: UNIT_ID.PORT, x: -5344.0, y: -4768.0 }, cityType: 'port' },
			{ barrack: { typeId: UNIT_ID.PORT, x: -2848.0, y: -4576.0 }, cityType: 'port' },
		],
	});
	CountrySettings.push({
		name: 'Sri Lanka',
		spawnerData: {
			unitData: { x: -2755.75, y: -10307.75 },
		},
		cities: [
			{ barrack: { typeId: UNIT_ID.PORT, x: -2208.0, y: -10976.0 }, cityType: 'port' },
			{ barrack: { x: -3072.0, y: -9664.0 } },
		],
	});
	CountrySettings.push({
		name: 'Central India',
		spawnerData: {
			unitData: { x: -3521.25, y: -2503.5 },
		},
		cities: [
			{ barrack: { x: -4992.0, y: -3008.0 } },
			{ barrack: { x: -4352.0, y: -832.0 } },
			{ barrack: { x: -1664.0, y: -2368.0 } },
			{ barrack: { x: -3136.0, y: -3008.0 } },
			{ barrack: { x: -2880.0, y: -1664.0 } },
		],
	});
	CountrySettings.push({
		name: 'West India',
		spawnerData: {
			unitData: { x: -5953.0, y: 57.75 },
		},
		cities: [
			{ barrack: { x: -6464.0, y: -512.0 } },
			{ barrack: { x: -5440.0, y: 512.0 } },
		],
	});
	CountrySettings.push({
		name: 'Pradesh',
		spawnerData: {
			unitData: { x: -3779.5, y: 832.75 },
		},
		cities: [
			{ barrack: { x: -4608.0, y: 1472.0 } },
			{ barrack: { x: -3136.0, y: 256.0 } },
		],
	});
	CountrySettings.push({
		name: 'North India',
		spawnerData: {
			unitData: { x: -4301.25, y: 3134.5 },
		},
		cities: [
			{ barrack: { x: -4096.0, y: 4032.0 } },
			{ barrack: { x: -3648.0, y: 2688.0 } },
		],
	});
	CountrySettings.push({
		name: 'East China',
		spawnerData: {
			unitData: { x: 6449.5, y: 3382.25 },
		},
		cities: [
			{ barrack: { x: 5888.0, y: 4544.0 } },
			{ barrack: { x: 8256.0, y: 4480.0 } },
			{ barrack: { x: 4736.0, y: 2752.0 } },
			{ barrack: { x: 6848.0, y: 704.0 } },
			{ barrack: { x: 8384.0, y: 2496.0 } },
		],
	});
	CountrySettings.push({
		name: 'Shandong',
		spawnerData: {
			unitData: { x: 6465.5, y: 7225.25 },
		},
		cities: [
			{ barrack: { x: 7808.0, y: 7360.0 } },
			{ barrack: { x: 6592.0, y: 8384.0 } },
			{ barrack: { x: 5696.0, y: 6912.0 } },
		],
	});
	CountrySettings.push({
		name: 'Pakistan',
		spawnerData: {
			unitData: { x: -6990.0, y: 1980.25 },
		},
		cities: [
			{ barrack: { x: -7808.0, y: 1792.0 } },
			{ barrack: { x: -6208.0, y: 2496.0 } },
			{ barrack: { x: -5760.0, y: 4032.0 } },
		],
	});
	CountrySettings.push({
		name: 'North Iran',
		spawnerData: {
			unitData: { x: -11977.0, y: 5432.5 },
		},
		cities: [
			{ barrack: { x: -12608.0, y: 5120.0 } },
			{ barrack: { x: -11968.0, y: 6336.0 } },
			{ barrack: { x: -11136.0, y: 4928.0 } },
			{ barrack: { x: -10176.0, y: 5696.0 } },
		],
	});
	CountrySettings.push({
		name: 'South Iran',
		spawnerData: {
			unitData: { x: -10947.75, y: 2246.0 },
		},
		cities: [
			{ barrack: { typeId: UNIT_ID.PORT, x: -10016.0, y: 1824.0 }, cityType: 'port' },
			{ barrack: { x: -12032.0, y: 2432.0 } },
			{ barrack: { x: -10112.0, y: 3200.0 } },
		],
	});
	CountrySettings.push({
		name: 'Azerbaijan',
		spawnerData: {
			unitData: { x: -12739.75, y: 8506.0 },
		},
		cities: [
			{ barrack: { x: -13056.0, y: 8000.0 } },
			{ barrack: { x: -12160.0, y: 8960.0 } },
		],
	});
	CountrySettings.push({
		name: 'Afghanistan',
		spawnerData: {
			unitData: { x: -7880.5, y: 4540.25 },
		},
		cities: [
			{ barrack: { x: -8640.0, y: 3904.0 } },
			{ barrack: { x: -7296.0, y: 4096.0 } },
			{ barrack: { x: -8064.0, y: 5312.0 } },
			{ barrack: { x: -6656.0, y: 5568.0 } },
		],
	});
	CountrySettings.push({
		name: 'Turkmenistan',
		spawnerData: {
			unitData: { x: -9544.75, y: 7736.25 },
		},
		cities: [
			{ barrack: { x: -8768.0, y: 7296.0 } },
			{ barrack: { x: -9728.0, y: 8448.0 } },
		],
	});
	CountrySettings.push({
		name: 'Uzbekistan',
		spawnerData: {
			unitData: { x: -8005.5, y: 9016.25 },
		},
		cities: [
			{ barrack: { x: -7552.0, y: 8320.0 } },
			{ barrack: { x: -8512.0, y: 9728.0 } },
		],
	});
	CountrySettings.push({
		name: 'Tajikistan',
		spawnerData: {
			unitData: { x: -5824.25, y: 6967.5 },
		},
		cities: [
			{ barrack: { x: -5056.0, y: 6848.0 } },
			{ barrack: { x: -7168.0, y: 6912.0 } },
		],
	});
	CountrySettings.push({
		name: 'Kyrgyzstan',
		spawnerData: {
			unitData: { x: -4428.25, y: 7999.5 },
		},
		cities: [
			{ barrack: { x: -5120.0, y: 8128.0 } },
			{ barrack: { x: -3904.0, y: 8320.0 } },
		],
	});
	CountrySettings.push({
		name: 'East Kazakhstan',
		spawnerData: {
			unitData: { x: -4802.25, y: 11451.0 },
		},
		cities: [
			{ barrack: { x: -5824.0, y: 10496.0 } },
			{ barrack: { x: -6464.0, y: 11968.0 } },
			{ barrack: { x: -4032.0, y: 10304.0 } },
			{ barrack: { x: -4928.0, y: 13184.0 } },
			{ barrack: { x: -3776.0, y: 11904.0 } },
			{ barrack: { x: -2112.0, y: 11520.0 } },
		],
	});
	CountrySettings.push({
		name: 'Mangystau',
		spawnerData: {
			unitData: { x: -10179.5, y: 10297.75 },
		},
		cities: [
			{ barrack: { x: -10624.0, y: 9792.0 } },
			{ barrack: { x: -10752.0, y: 10880.0 } },
		],
	});
	CountrySettings.push({
		name: 'West Kazakhstan',
		spawnerData: {
			unitData: { x: -10053.5, y: 12856.75 },
		},
		cities: [
			{ barrack: { x: -8320.0, y: 12160.0 } },
			{ barrack: { x: -9216.0, y: 13312.0 } },
			{ barrack: { x: -10944.0, y: 13376.0 } },
		],
	});
	CountrySettings.push({
		name: 'Hainan',
		spawnerData: {
			unitData: { x: 6717.5, y: -1609.75 },
		},
		cities: [
			{ barrack: { typeId: UNIT_ID.PORT, x: 7136.0, y: -1504.0 }, cityType: 'port' },
		],
	});
	CountrySettings.push({
		name: 'Volga',
		spawnerData: {
			unitData: { x: -12620.75, y: 15031.0 },
		},
		cities: [
			{ barrack: { x: -13120.0, y: 14976.0 } },
			{ barrack: { x: -12160.0, y: 16064.0 } },
		],
	});
	CountrySettings.push({
		name: 'Ural',
		spawnerData: {
			unitData: { x: -10181.0, y: 15799.25 },
		},
		cities: [
			{ barrack: { x: -11264.0, y: 15232.0 } },
			{ barrack: { x: -9856.0, y: 14976.0 } },
			{ barrack: { x: -9088.0, y: 16000.0 } },
		],
	});
	CountrySettings.push({
		name: 'Central Russia',
		spawnerData: {
			unitData: { x: -6597.75, y: 15288.5 },
		},
		cities: [
			{ barrack: { x: -7616.0, y: 14528.0 } },
			{ barrack: { x: -7296.0, y: 16064.0 } },
			{ barrack: { x: -5568.0, y: 16064.0 } },
		],
	});
	CountrySettings.push({
		name: 'Siberia',
		spawnerData: {
			unitData: { x: -458.25, y: 14905.5 },
		},
		cities: [
			{ barrack: { x: -1856.0, y: 14848.0 } },
			{ barrack: { x: 384.0, y: 14144.0 } },
			{ barrack: { x: 64.0, y: 15872.0 } },
		],
	});
	CountrySettings.push({
		name: 'Eastern Russia',
		spawnerData: {
			unitData: { x: 4155.5, y: 15165.0 },
		},
		cities: [
			{ barrack: { x: 3072.0, y: 14720.0 } },
			{ barrack: { x: 3904.0, y: 15936.0 } },
			{ barrack: { x: 5184.0, y: 15488.0 } },
		],
	});
	CountrySettings.push({
		name: 'Cambodia',
		spawnerData: {
			unitData: { x: 6454.5, y: -5703.75 },
		},
		cities: [
			{ barrack: { typeId: UNIT_ID.PORT, x: 5344.0, y: -6688.0 }, cityType: 'port' },
			{ barrack: { x: 5888.0, y: -5376.0 } },
			{ barrack: { x: 7104.0, y: -4864.0 } },
		],
	});
	CountrySettings.push({
		name: 'Thailand',
		spawnerData: {
			unitData: { x: 4924.0, y: -4677.5 },
		},
		cities: [
			{ barrack: { x: 4352.0, y: -5248.0 } },
			{ barrack: { x: 4736.0, y: -3904.0 } },
			{ barrack: { x: 3584.0, y: -2880.0 } },
		],
	});
	CountrySettings.push({
		name: 'Myanmar',
		spawnerData: {
			unitData: { x: 2360.5, y: -2374.25 },
		},
		cities: [
			{ barrack: { typeId: UNIT_ID.PORT, x: 2272.0, y: -3488.0 }, cityType: 'port' },
			{ barrack: { x: 1792.0, y: -1216.0 } },
			{ barrack: { x: 3072.0, y: -1728.0 } },
		],
	});
	CountrySettings.push({
		name: 'Bangladesh',
		spawnerData: {
			unitData: { x: 56.5, y: -840.5 },
		},
		cities: [
			{ barrack: { typeId: UNIT_ID.PORT, x: 352.0, y: -1312.0 }, cityType: 'port' },
			{ barrack: { x: -192.0, y: -320.0 } },
		],
	});
	CountrySettings.push({
		name: 'Vietnam',
		spawnerData: {
			unitData: { x: 5691.5, y: -824.0 },
		},
		cities: [
			{ barrack: { x: 5504.0, y: -1536.0 } },
			{ barrack: { x: 5248.0, y: -384.0 } },
		],
	});
	CountrySettings.push({
		name: 'Laos',
		spawnerData: {
			unitData: { x: 4537.5, y: -1595.75 },
		},
		cities: [
			{ barrack: { x: 6272.0, y: -3712.0 } },
			{ barrack: { x: 4736.0, y: -2368.0 } },
		],
	});
	CountrySettings.push({
		name: 'Yemen',
		spawnerData: {
			unitData: { x: -13125.25, y: -2626.5 },
		},
		cities: [
			{ barrack: { typeId: UNIT_ID.PORT, x: -12256.0, y: -3040.0 }, cityType: 'port' },
			{ barrack: { x: -13760.0, y: -2432.0 } },
		],
	});
	CountrySettings.push({
		name: 'Oman',
		spawnerData: {
			unitData: { x: -11075.0, y: -1478.25 },
		},
		cities: [
			{ barrack: { typeId: UNIT_ID.PORT, x: -10400.0, y: -480.0 }, cityType: 'port' },
			{ barrack: { x: -11200.0, y: -2048.0 } },
		],
	});
	CountrySettings.push({
		name: 'UAE',
		spawnerData: {
			unitData: { x: -11848.5, y: -68.5 },
		},
		cities: [
			{ barrack: { x: -12352.0, y: 64.0 } },
			{ barrack: { x: -11264.0, y: 192.0 } },
		],
	});
	CountrySettings.push({
		name: 'Madagascar',
		spawnerData: {
			unitData: { x: -12488.5, y: -14013.75 },
		},
		cities: [
			{ barrack: { typeId: UNIT_ID.PORT, x: -13184.0, y: -14656.0 }, cityType: 'port' },
			{ barrack: { x: -12672.0, y: -13376.0 } },
			{ barrack: { typeId: UNIT_ID.PORT, x: -11872.0, y: -12192.0 }, cityType: 'port' },
		],
	});
	CountrySettings.push({
		name: 'West Indonesia',
		spawnerData: {
			unitData: { x: 4537.5, y: -12364.0 },
		},
		cities: [
			{ barrack: { typeId: UNIT_ID.PORT, x: 2624.0, y: -10432.0 }, cityType: 'port' },
			{ barrack: { x: 3968.0, y: -11456.0 } },
			{ barrack: { x: 5056.0, y: -12800.0 } },
			{ barrack: { x: 5760.0, y: -13824.0 } },
		],
	});
	CountrySettings.push({
		name: 'East Timor',
		spawnerData: {
			unitData: { x: 13242.25, y: -14663.5 },
		},
		cities: [
			{ barrack: { typeId: UNIT_ID.PORT, x: 12512.0, y: -15392.0 }, cityType: 'port' },
			{ barrack: { x: 13696.0, y: -14144.0 } },
		],
	});
	CountrySettings.push({
		name: 'Central Indonesia',
		spawnerData: {
			unitData: { x: 9530.0, y: -10949.75 },
		},
		cities: [
			{ barrack: { x: 8384.0, y: -12096.0 } },
			{ barrack: { x: 9728.0, y: -11392.0 } },
			{ barrack: { x: 10496.0, y: -9728.0 } },
		],
	});
	CountrySettings.push({
		name: 'East Indonesia',
		spawnerData: {
			unitData: { x: 11964.75, y: -11455.75 },
		},
		cities: [
			{ barrack: { typeId: UNIT_ID.PORT, x: 12256.0, y: -10400.0 }, cityType: 'port' },
			{ barrack: { x: 12224.0, y: -11968.0 } },
		],
	});
	CountrySettings.push({
		name: 'Kuwait',
		spawnerData: {
			unitData: { x: -14274.0, y: 3896.5 },
		},
		cities: [
			{ barrack: { x: -14016.0, y: 3328.0 } },
			{ barrack: { x: -14080.0, y: 4480.0 } },
		],
	});
}
