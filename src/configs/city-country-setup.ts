import { CountrySettings } from 'src/app/country/countries';
import { UNIT_ID } from 'src/configs/unit-id';

export function SetCountries() {
	CountrySettings.push({
		name: 'Germany',
		spawnerData: {
			unitData: { x: -960.0, y: -1088.0 },
		},
		cities: [
			{ barrack: { x: 320, y: 320 } },
			{ barrack: { x: -832.0, y: 64.0 } },
			{ barrack: { x: 320, y: -1024.0 } },
			{ barrack: { x: -1472.0, y: -1024.0 } },
			{ barrack: { x: -1408.0, y: -2432.0 } },
			{ barrack: { x: -384.0, y: -2944.0 } },
		],
	});
	CountrySettings.push({
		name: 'Poland',
		spawnerData: {
			unitData: { x: 2752.0, y: -64.0 },
		},
		cities: [
			{ barrack: { x: 3584.0, y: 128.0 } },
			{ barrack: { x: 1664.0, y: -384.0 } },
			{ barrack: { x: 2048.0, y: 832.0 } },
			{ barrack: { x: 4032.0, y: -1152.0 } },
		],
	});
	CountrySettings.push({
		name: 'Czechia',
		spawnerData: {
			unitData: { x: 1216.0, y: -1984.0 },
		},
		cities: [{ barrack: { x: 768.0, y: -2048.0 } }, { barrack: { x: 2112.0, y: -1664.0 } }],
	});
	CountrySettings.push({
		name: 'Austria',
		spawnerData: {
			unitData: { x: 832.0, y: -3392.0 },
		},
		cities: [{ barrack: { x: 1408.0, y: -3008.0 } }, { barrack: { x: 448.0, y: -3648.0 } }],
	});
	CountrySettings.push({
		name: 'Slovenia',
		spawnerData: {
			unitData: { x: 1216.0, y: -4544.0 },
		},
		cities: [{ barrack: { x: 1856.0, y: -4032.0 } }, { barrack: { x: 896.0, y: -4736.0 } }],
	});
	CountrySettings.push({
		name: 'Croatia',
		spawnerData: {
			unitData: { x: 2112.0, y: -5056.0 },
		},
		cities: [{ barrack: { x: 2880.0, y: -4864.0 } }, { barrack: { x: 1920.0, y: -5760.0 } }],
	});
	CountrySettings.push({
		name: 'Bosnia',
		spawnerData: {
			unitData: { x: 3008.0, y: -6080.0 },
		},
		cities: [{ barrack: { x: 3456.0, y: -5632.0 } }, { barrack: { x: 2752.0, y: -6656.0 } }],
	});
	CountrySettings.push({
		name: 'Montenegro',
		spawnerData: {
			unitData: { x: 4032.0, y: -6976.0 },
		},
		cities: [{ barrack: { x: 3776.0, y: -6656.0 } }, { barrack: { x: 4736.0, y: -6720.0 } }],
	});
	CountrySettings.push({
		name: 'Serbia',
		spawnerData: {
			unitData: { x: 4416.0, y: -5696.0 },
		},
		cities: [{ barrack: { x: 4416.0, y: -4992.0 } }, { barrack: { x: 5248.0, y: -5568.0 } }],
	});
	CountrySettings.push({
		name: 'Macedonia',
		spawnerData: {
			unitData: { x: 5056.0, y: -7488.0 },
		},
		cities: [{ barrack: { x: 5952.0, y: -6848.0 } }, { barrack: { x: 5440.0, y: -7872.0 } }],
	});
	CountrySettings.push({
		name: 'Albania',
		spawnerData: {
			unitData: { x: 4160.0, y: -8128.0 },
		},
		cities: [{ barrack: { x: 4736.0, y: -8768.0 } }, { barrack: { typeId: UNIT_ID.PORT, x: 3600.0, y: -8017.0 }, cityType: 'port' }],
	});
	CountrySettings.push({
		name: 'Greece',
		spawnerData: {
			unitData: { x: 5696.0, y: -9024.0 },
		},
		cities: [
			{ barrack: { x: 7168.0, y: -7616.0 } },
			{ barrack: { typeId: UNIT_ID.PORT, x: 6112.0, y: -11232.0 }, cityType: 'port' },
			{ barrack: { x: 6464.0, y: -9472.0 } },
			{ barrack: { x: 5504.0, y: -9536.0 } },
		],
	});
	CountrySettings.push({
		name: 'Bulgaria',
		spawnerData: {
			unitData: { x: 6976.0, y: -6464.0 },
		},
		cities: [{ barrack: { x: 6784.0, y: -6016.0 } }, { barrack: { x: 7808.0, y: -5952.0 } }],
	});
	CountrySettings.push({
		name: 'Romania',
		spawnerData: {
			unitData: { x: 6080.0, y: -4288.0 },
		},
		cities: [
			{ barrack: { x: 5184.0, y: -3968.0 } },
			{ barrack: { x: 6144.0, y: -4864.0 } },
			{ barrack: { x: 7616.0, y: -4672.0 } },
			{ barrack: { x: 6528.0, y: -3456.0 } },
		],
	});
	CountrySettings.push({
		name: 'Moldova',
		spawnerData: {
			unitData: { x: 7744.0, y: -2880.0 },
		},
		cities: [{ barrack: { x: 7296.0, y: -2496.0 } }, { barrack: { x: 8384.0, y: -3136.0 } }],
	});
	CountrySettings.push({
		name: 'Ukraine',
		spawnerData: {
			unitData: { x: 8256.0, y: -1216.0 },
		},
		cities: [
			{ barrack: { x: 6080.0, y: -2048.0 } },
			{ barrack: { x: 5696.0, y: -1024.0 } },
			{ barrack: { x: 7232.0, y: -832.0 } },
			{ barrack: { x: 9344.0, y: -1984.0 } },
			{ barrack: { x: 10240.0, y: -384.0 } },
			{ barrack: { x: 11328.0, y: -1664.0 } },
		],
	});
	CountrySettings.push({
		name: 'Türkiye',
		spawnerData: {
			unitData: { x: 12864.0, y: -7232.0 },
		},
		cities: [
			{ barrack: { x: 10048.0, y: -9280.0 } },
			{ barrack: { x: 11072.0, y: -7168.0 } },
			{ barrack: { x: 12288.0, y: -8192.0 } },
			{ barrack: { x: 16704.0, y: -6080.0 } },
			{ barrack: { x: 15424.0, y: -7360.0 } },
			{ barrack: { typeId: UNIT_ID.PORT, x: 11360.0, y: -10336.0 }, cityType: 'port' },
			{ barrack: { typeId: UNIT_ID.PORT, x: 8800.0, y: -7392.0 }, cityType: 'port' },
		],
	});
	CountrySettings.push({
		name: 'Georgia',
		spawnerData: {
			unitData: { x: 15424.0, y: -4032.0 },
		},
		cities: [{ barrack: { x: 16064.0, y: -4096.0 } }, { barrack: { x: 14976.0, y: -3648.0 } }],
	});
	CountrySettings.push({
		name: 'Syria',
		spawnerData: {
			unitData: { x: 16704.0, y: -10048.0 },
		},
		cities: [{ barrack: { x: 17472.0, y: -9664.0 } }, { barrack: { x: 16064.0, y: -9408.0 } }, { barrack: { x: 16512.0, y: -10800.0 } }],
	});
	CountrySettings.push({
		name: 'Lebanon',
		spawnerData: {
			unitData: { x: 14784.0, y: -10304.0 },
		},
		cities: [{ barrack: { x: 14784.0, y: -9600.0 } }, { barrack: { x: 14976.0, y: -11136.0 } }],
	});
	CountrySettings.push({
		name: 'Palestine',
		spawnerData: {
			unitData: { x: 16192.0, y: -12480.0 },
		},
		cities: [{ barrack: { x: 15808.0, y: -12224.0 } }],
	});
	CountrySettings.push({
		name: 'Iraq',
		spawnerData: {
			unitData: { x: 17727.0, y: -12614.0 },
		},
		cities: [
			{ barrack: { x: 18257.0, y: -11937.0 } },
			{ barrack: { x: 17800.0, y: -13249.0 } },
		],
	});
	CountrySettings.push({
		name: 'Israel',
		spawnerData: {
			unitData: { x: 14656.0, y: -12736.0 },
		},
		cities: [{ barrack: { x: 14976.0, y: -13440.0 } }, { barrack: { typeId: UNIT_ID.PORT, x: 13900.0, y: -12320.0 }, cityType: 'port' }],
	});
	CountrySettings.push({
		name: 'Jordan',
		spawnerData: {
			unitData: { x: 16958.0, y: -14398.0 },
		},
		cities: [
			{ barrack: { x: 16424.0, y: -13604.0 } },
			{ barrack: { x: 16097.0, y: -14921.0 } },
			{ barrack: { x: 18066.0, y: -14658.0 } },
		],
	});
	CountrySettings.push({
		name: 'Egypt',
		spawnerData: {
			unitData: { x: 11072.0, y: -14912.0 },
		},
		cities: [
			{ barrack: { x: 14400.0, y: -14784.0 } },
			{ barrack: { x: 12480.0, y: -14080.0 } },
			{ barrack: { x: 12928.0, y: -15104.0 } },
			{ barrack: { x: 9408.0, y: -15104.0 } },
		],
	});
	CountrySettings.push({
		name: 'Lybia',
		spawnerData: {
			unitData: { x: 6976.0, y: -14912.0 },
		},
		cities: [
			{ barrack: { x: 7680.0, y: -14528.0 } },
			{ barrack: { x: 6208.0, y: -15040.0 } },
			{ barrack: { typeId: UNIT_ID.PORT, x: 5088.0, y: -14112.0 }, cityType: 'port' },
		],
	});
	CountrySettings.push({
		name: 'Tunisia',
		spawnerData: {
			unitData: { x: -1728.0, y: -14400.0 },
		},
		cities: [{ barrack: { x: -1408.0, y: -13824.0 } }, { barrack: { typeId: UNIT_ID.PORT, x: -160.0, y: -14496.0 }, cityType: 'port' }],
	});
	CountrySettings.push({
		name: 'Algeria',
		spawnerData: {
			unitData: { x: -5312.0, y: -14272.0 },
		},
		cities: [{ barrack: { x: -3648.0, y: -14144.0 } }, { barrack: { x: -5760.0, y: -15040.0 } }, { barrack: { x: -7360.0, y: -14336.0 } }],
	});
	CountrySettings.push({
		name: 'Morocco',
		spawnerData: {
			unitData: { x: -10176.0, y: -14400.0 },
		},
		cities: [
			{ barrack: { x: -8832.0, y: -15104.0 } },
			{ barrack: { x: -10688.0, y: -14080.0 } },
			{ barrack: { typeId: UNIT_ID.PORT, x: -12320.0, y: -14368.0 }, cityType: 'port' },
		],
	});
	CountrySettings.push({
		name: 'Portugal',
		spawnerData: {
			unitData: { x: -11200.0, y: -8128.0 },
		},
		cities: [
			{ barrack: { x: -11328.0, y: -9600.0 } },
			{ barrack: { x: -10624.0, y: -7296.0 } },
			{ barrack: { typeId: UNIT_ID.PORT, x: -12000.0, y: -7968.0 }, cityType: 'port' },
		],
	});
	CountrySettings.push({
		name: 'Spain',
		spawnerData: {
			unitData: { x: -8896.0, y: -8384.0 },
		},
		cities: [
			{ barrack: { x: -9728.0, y: -10240.0 } },
			{ barrack: { x: -9408.0, y: -8192.0 } },
			{ barrack: { x: -7616.0, y: -6976.0 } },
			{ barrack: { x: -10112.0, y: -5972.0 } },
			{ barrack: { x: -8035.0, y: -9572.0 } },
		],
	});
	CountrySettings.push({
		name: 'Catalonia',
		spawnerData: {
			unitData: { x: -7104, y: -8640 },
		},
		cities: [{ barrack: { x: -6450.0, y: -7835.0 } }, { barrack: { typeId: UNIT_ID.PORT, x: -6634.0, y: -9181.0 }, cityType: 'port' }],
	});
	CountrySettings.push({
		name: 'France',
		spawnerData: {
			unitData: { x: -5056.0, y: -4288.0 },
		},
		cities: [
			{ barrack: { x: -5504.0, y: -6272.0 } },
			{ barrack: { x: -5440.0, y: -5120.0 } },
			{ barrack: { x: -3584.0, y: -5568.0 } },
			{ barrack: { x: -3520.0, y: -3776.0 } },
			{ barrack: { x: -4800.0, y: -3136.0 } },
			// { barrack: { x: -6336.0, y: -3456.0 } },
			{ barrack: { typeId: UNIT_ID.PORT, x: -6944.0, y: -4704.0 }, cityType: 'port' },
			{ barrack: { typeId: UNIT_ID.PORT, x: -4384.0, y: -7008.0 }, cityType: 'port' },
		],
	});
	CountrySettings.push({
		name: 'Switzerland',
		spawnerData: {
			unitData: { x: -1856.0, y: -4288.0 },
		},
		cities: [{ barrack: { x: -2432.0, y: -4160.0 } }, { barrack: { x: -1280.0, y: -4352.0 } }],
	});
	CountrySettings.push({
		name: 'Northern Italy',
		spawnerData: {
			unitData: { x: -1086.0, y: -5567.0 },
		},
		cities: [
			{ barrack: { x: -1856.0, y: -5440.0 } },
			{ barrack: { x: -272.0, y: -6752.0 } },
			{ barrack: { typeId: UNIT_ID.PORT, x: -109.0, y: -5507.0 }, cityType: 'port' },
		],
	});
	CountrySettings.push({
		name: 'Southern Italy',
		spawnerData: {
			unitData: { x: 1728.0, y: -8507.0 },
		},
		cities: [{ barrack: { x: 1329.0, y: -7928.0 } }, { barrack: { x: 1923.0, y: -9244.0 } }],
	});
	CountrySettings.push({
		name: 'Belgium',
		spawnerData: {
			unitData: { x: -3777.0, y: -1982.0 },
		},
		cities: [{ barrack: { x: -3072.0, y: -2368.0 } }, { barrack: { typeId: UNIT_ID.PORT, x: -4384.0, y: -608.0 }, cityType: 'port' }],
	});
	CountrySettings.push({
		name: 'Netherlands',
		spawnerData: {
			unitData: { x: -3008.0, y: -448.0 },
		},
		cities: [
			{ barrack: { x: -3200.0, y: -1024.0 } },
			{ barrack: { x: -2368.0, y: -128.0 } },
			{ barrack: { typeId: UNIT_ID.PORT, x: -3168.0, y: 480.0 }, cityType: 'port' },
		],
	});
	CountrySettings.push({
		name: 'Denmark',
		spawnerData: {
			unitData: { x: -1344.0, y: 1600.0 },
		},
		cities: [
			{ barrack: { x: -960.0, y: 1408.0 } },
			{ barrack: { x: -1088.0, y: 2560.0 } },
			{ barrack: { typeId: UNIT_ID.PORT, x: -2272.0, y: 2464.0 }, cityType: 'port' },
		],
	});
	CountrySettings.push({
		name: 'Norway',
		spawnerData: {
			unitData: { x: -1344.0, y: 6336.0 },
		},
		cities: [
			{ barrack: { x: -1856.0, y: 5056.0 } },
			{ barrack: { x: -768.0, y: 5312.0 } },
			{ barrack: { x: -640.0, y: 7232.0 } },
			{ barrack: { x: 576.0, y: 10112.0 } },
			{ barrack: { x: 1728.0, y: 12224.0 } },
			{ barrack: { typeId: UNIT_ID.PORT, x: -2464.0, y: 3680.0 }, cityType: 'port' },
			{ barrack: { typeId: UNIT_ID.PORT, x: -1760.0, y: 7904.0 }, cityType: 'port' },
		],
	});
	CountrySettings.push({
		name: 'Sweden',
		spawnerData: {
			unitData: { x: 704.0, y: 7744.0 },
		},
		cities: [
			{ barrack: { x: 1856.0, y: 10240.0 } },
			{ barrack: { x: 1216.0, y: 8704.0 } },
			{ barrack: { x: 576.0, y: 6400.0 } },
			{ barrack: { x: 512.0, y: 3392.0 } },
			{ barrack: { typeId: UNIT_ID.PORT, x: 1760.0, y: 3040.0 }, cityType: 'port' },
		],
	});
	CountrySettings.push({
		name: 'Finland',
		spawnerData: {
			unitData: { x: 3648.0, y: 7744.0 },
		},
		cities: [
			{ barrack: { x: 3968.0, y: 11584.0 } },
			{ barrack: { x: 4800.0, y: 10368.0 } },
			{ barrack: { x: 4480.0, y: 8448.0 } },
			{ barrack: { x: 4096.0, y: 6848.0 } },
			{ barrack: { typeId: UNIT_ID.PORT, x: 3424.0, y: 9184.0 }, cityType: 'port' },
		],
	});
	CountrySettings.push({
		name: 'England',
		spawnerData: {
			unitData: { x: -6848.0, y: 832.0 },
		},
		cities: [
			{ barrack: { x: -6528.0, y: 256.0 } },
			{ barrack: { x: -6784.0, y: 1600.0 } },
			{ barrack: { x: -7040.0, y: 3200.0 } },
			{ barrack: { typeId: UNIT_ID.PORT, x: -8352.0, y: -672.0 }, cityType: 'port' },
		],
	});
	CountrySettings.push({
		name: 'Ireland',
		spawnerData: {
			unitData: { x: -11584.0, y: 2112.0 },
		},
		cities: [
			{ barrack: { x: -11136.0, y: 2368.0 } },
			{ barrack: { typeId: UNIT_ID.PORT, x: -10208.0, y: 4000.0 }, cityType: 'port' },
			{ barrack: { typeId: UNIT_ID.PORT, x: -11488.0, y: 800.0 }, cityType: 'port' },
		],
	});
	CountrySettings.push({
		name: 'Iceland',
		spawnerData: {
			unitData: { x: -7360.0, y: 9664.0 },
		},
		cities: [
			{ barrack: { x: -6592.0, y: 9344.0 } },
			{ barrack: { x: -7936.0, y: 9792.0 } },
			{ barrack: { typeId: UNIT_ID.PORT, x: -7200.0, y: 7968.0 }, cityType: 'port' },
			{ barrack: { typeId: UNIT_ID.PORT, x: -5920.0, y: 10464.0 }, cityType: 'port' },
		],
	});
	CountrySettings.push({
		name: 'Svalbard',
		spawnerData: {
			unitData: { x: -1088.0, y: 14784.0 },
		},
		cities: [{ barrack: { x: -576.0, y: 14912.0 } }, { barrack: { typeId: UNIT_ID.PORT, x: -1760.0, y: 14496.0 }, cityType: 'port' }],
	});
	CountrySettings.push({
		name: 'Estonia',
		spawnerData: {
			unitData: { x: 4544.0, y: 4928.0 },
		},
		cities: [{ barrack: { x: 5056.0, y: 5312.0 } }, { barrack: { typeId: UNIT_ID.PORT, x: 4128.0, y: 4640.0 }, cityType: 'port' }],
	});
	CountrySettings.push({
		name: 'Latvia',
		spawnerData: {
			unitData: { x: 4672.0, y: 3776.0 },
		},
		cities: [{ barrack: { x: 5440.0, y: 3520.0 } }, { barrack: { typeId: UNIT_ID.PORT, x: 3104.0, y: 3616.0 }, cityType: 'port' }],
	});
	CountrySettings.push({
		name: 'Lithuania',
		spawnerData: {
			unitData: { x: 4672.0, y: 2368.0 },
		},
		cities: [{ barrack: { x: 5312.0, y: 2048.0 } }, { barrack: { x: 4160.0, y: 2496.0 } }],
	});
	CountrySettings.push({
		name: 'Kaliningrad',
		spawnerData: {
			unitData: { x: 3520.0, y: 1472.0 },
		},
		cities: [{ barrack: { x: 4096.0, y: 1344.0 } }, { barrack: { typeId: UNIT_ID.PORT, x: 2976.0, y: 1952.0 }, cityType: 'port' }],
	});
	CountrySettings.push({
		name: 'Belarus',
		spawnerData: {
			unitData: { x: 6336.0, y: 1216.0 },
		},
		cities: [
			{ barrack: { x: 6912.0, y: 2560.0 } },
			{ barrack: { x: 6912.0, y: 1472.0 } },
			{ barrack: { x: 7680.0, y: 512.0 } },
			{ barrack: { x: 5376.0, y: 384.0 } },
		],
	});
	CountrySettings.push({
		name: 'Malta',
		spawnerData: {
			unitData: { x: 1216.0, y: -12992.0 },
		},
		cities: [{ barrack: { x: 896.0, y: -13120.0 } }, { barrack: { typeId: UNIT_ID.PORT, x: 2410.0, y: -12836.0 }, cityType: 'port' }],
	});

	CountrySettings.push({
		name: 'Karelia',
		spawnerData: {
			unitData: { x: 6592, y: 8896 },
		},
		cities: [
			{ barrack: { x: 7680.0, y: 8960.0 } },
			{ barrack: { x: 5824.0, y: 9728.0 } },
			{ barrack: { x: 6144.0, y: 12416.0 } },
			{ barrack: { typeId: UNIT_ID.PORT, x: 6880.0, y: 10464.0 }, cityType: 'port' },
		],
	});
	CountrySettings.push({
		name: 'Leningrad',
		spawnerData: {
			unitData: { x: 7872, y: 5440 },
		},
		cities: [
			{ barrack: { x: 6848.0, y: 4672.0 } },
			{ barrack: { x: 8896.0, y: 6080.0 } },
			{ barrack: { typeId: UNIT_ID.PORT, x: 6048.0, y: 6112.0 }, cityType: 'port' },
		],
	});
	CountrySettings.push({
		name: 'Arkhangelsk',
		spawnerData: {
			unitData: { x: 10688, y: 9536 },
		},
		cities: [{ barrack: { x: 12160.0, y: 7872.0 } }, { barrack: { x: 9408.0, y: 8448.0 } }, { barrack: { x: 9920.0, y: 10880.0 } }],
	});
	CountrySettings.push({
		name: 'North Russia',
		spawnerData: {
			unitData: { x: 14144, y: 12736 },
		},
		cities: [
			{ barrack: { x: 17920.0, y: 13888.0 } },
			{ barrack: { x: 13440.0, y: 11520.0 } },
			{ barrack: { x: 12544.0, y: 13376.0 } },
			{ barrack: { x: 14976.0, y: 14016.0 } },
			{ barrack: { x: 17408.0, y: 10496.0 } },
		],
	});

	CountrySettings.push({
		name: 'Slovakia',
		spawnerData: {
			unitData: { x: 3136.0, y: -2496.0 },
		},
		cities: [{ barrack: { x: 3968.0, y: -2304.0 } }, { barrack: { x: 2752.0, y: -2624.0 } }],
	});
	CountrySettings.push({
		name: 'Hungary',
		spawnerData: {
			unitData: { x: 3520.0, y: -3776.0 },
		},
		cities: [{ barrack: { x: 4416.0, y: -3200.0 } }, { barrack: { x: 3136.0, y: -3776.0 } }],
	});
	CountrySettings.push({
		name: 'Sicily',
		spawnerData: {
			unitData: { x: 960.0, y: -10816.0 },
		},
		cities: [{ barrack: { x: 450.0, y: -10368.0 } }, { barrack: { typeId: UNIT_ID.PORT, x: 1238.0, y: -11566.0 }, cityType: 'port' }],
	});
	CountrySettings.push({
		name: 'Disko Bay',
		spawnerData: {
			unitData: { x: -11072.0, y: 14272.0 },
		},
		cities: [
			{ barrack: { x: -11584.0, y: 14400.0 } },
			{ barrack: { x: -10432.0, y: 15104.0 } },
			{ barrack: { typeId: UNIT_ID.PORT, x: -11040.0, y: 12960.0 }, cityType: 'port' },
		],
	});
	CountrySettings.push({
		name: 'East Greenland',
		spawnerData: {
			unitData: { x: -6464.0, y: 14784.0 },
		},
		cities: [{ barrack: { x: -6016.0, y: 15424.0 } }, { barrack: { typeId: UNIT_ID.PORT, x: -5600.0, y: 14048.0 }, cityType: 'port' }],
	});
	CountrySettings.push({
		name: 'Sami',
		spawnerData: {
			unitData: { x: 3776.0, y: 13376.0 },
		},
		cities: [{ barrack: { x: 3264.0, y: 13504.0 } }, { barrack: { x: 4160.0, y: 13056.0 } }],
	});
	CountrySettings.push({
		name: 'Scotland',
		spawnerData: {
			unitData: { x: -7488.0, y: 5056.0 },
		},
		cities: [
			{ barrack: { x: -7950.0, y: 4672.0 } },
			{ barrack: { x: -7552.0, y: 5952.0 } },
			{ barrack: { typeId: UNIT_ID.PORT, x: -6432.0, y: 4960.0 }, cityType: 'port' },
		],
	});
	CountrySettings.push({
		name: 'Novaya',
		spawnerData: {
			unitData: { x: 10816.0, y: 15808.0 },
		},
		cities: [{ barrack: { x: 10496.0, y: 16064.0 } }, { barrack: { typeId: UNIT_ID.PORT, x: 11936.0, y: 15584.0 }, cityType: 'port' }],
	});
	CountrySettings.push({
		name: 'Crimea',
		spawnerData: {
			unitData: { x: 10944.0, y: -3904.0 },
		},
		cities: [{ barrack: { x: 11456.0, y: -3264.0 } }, { barrack: { typeId: UNIT_ID.PORT, x: 10464.0, y: -4128.0 }, cityType: 'port' }],
	});
	CountrySettings.push({
		name: 'Azerbaijan',
		spawnerData: {
			unitData: { x: 17984.0, y: -4288.0 },
		},
		cities: [{ barrack: { x: 18332.0, y: -3484.0 } }, { barrack: { x: 17472.0, y: -4352.0 } }],
	});
	CountrySettings.push({
		name: 'Armenia',
		spawnerData: {
			unitData: { x: 17984.0, y: -5952.0 },
		},
		cities: [{ barrack: { x: 18432.0, y: -5888.0 } }],
	});
	CountrySettings.push({
		name: 'Southern Russia',
		spawnerData: {
			unitData: { x: 15936.0, y: -320.0 },
		},
		cities: [
			{ barrack: { x: 14400.0, y: -1856.0 } },
			{ barrack: { x: 14848.0, y: 1216.0 } },
			{ barrack: { x: 16704.0, y: 1088.0 } },
			{ barrack: { x: 17088.0, y: -1152.0 } },
			{ barrack: { typeId: UNIT_ID.PORT, x: 13024.0, y: -3808.0 }, cityType: 'port' },
		],
	});
	CountrySettings.push({
		name: 'Volga',
		spawnerData: {
			unitData: { x: 17088.0, y: 5184.0 },
		},
		cities: [{ barrack: { x: 15424.0, y: 5376.0 } }, { barrack: { x: 18048.0, y: 6720.0 } }, { barrack: { x: 17984.0, y: 3840.0 } }],
	});
	CountrySettings.push({
		name: 'Central Russia',
		spawnerData: {
			unitData: { x: 11584.0, y: 3392.0 },
		},
		cities: [
			{ barrack: { x: 8640.0, y: 3264.0 } },
			{ barrack: { x: 10496.0, y: 1536.0 } },
			{ barrack: { x: 13056.0, y: 2496.0 } },
			{ barrack: { x: 11264.0, y: 3968.0 } },
			{ barrack: { x: 12864.0, y: 5632.0 } },
		],
	});
	CountrySettings.push({
		name: 'Siberia',
		spawnerData: {
			unitData: { x: 17216.0, y: 15424.0 },
		},
		cities: [{ barrack: { x: 16576.0, y: 15744.0 } }, { barrack: { x: 18176.0, y: 15616.0 } }],
	});
	CountrySettings.push({
		name: 'Moscow',
		spawnerData: {
			unitData: { x: 14528.0, y: 8768.0 },
		},
		cities: [{ barrack: { x: 15296.0, y: 8960.0 } }, { barrack: { x: 13952.0, y: 8384.0 } }],
	});
	CountrySettings.push({
		name: 'National Park',
		spawnerData: {
			unitData: { x: -8640.0, y: 14400.0 },
		},
		cities: [{ barrack: { x: -8768.0, y: 15232.0 } }, { barrack: { x: -7936.0, y: 14336.0 } }, { barrack: { x: -9262.0, y: 13906.0 } }],
	});
	CountrySettings.push({
		name: 'West Greenland',
		spawnerData: {
			unitData: { x: -12864.0, y: 13888.0 },
		},
		cities: [{ barrack: { x: -12736.0, y: 14976.0 } }, { barrack: { x: -12352.0, y: 13320.0 } }],
	});
	CountrySettings.push({
		name: 'Wales',
		spawnerData: {
			unitData: { x: -8384.0, y: 1472.0 },
		},
		cities: [{ barrack: { x: -8000.0, y: 2304.0 } }, { barrack: { x: -8512.0, y: 1216.0 } }],
	});
	CountrySettings.push({
		name: 'Corsica',
		spawnerData: {
			unitData: { x: -1857.0, y: -8135.0 },
		},
		cities: [{ barrack: { x: -2117.0, y: -7724.0 } }, { barrack: { typeId: UNIT_ID.PORT, x: -1250.0, y: -8326.0 }, cityType: 'port' }],
	});
	CountrySettings.push({
		name: 'Sardinia',
		spawnerData: {
			unitData: { x: -1987.0, y: -9927.0 },
		},
		cities: [{ barrack: { x: -2305.0, y: -9428.0 } }, { barrack: { typeId: UNIT_ID.PORT, x: -1758.0, y: -10512.0 }, cityType: 'port' }],
	});
	CountrySettings.push({
		name: 'Crete',
		spawnerData: {
			unitData: { x: 7616.0, y: -11712.0 },
		},
		cities: [
			{ barrack: { typeId: UNIT_ID.PORT, x: 8864.0, y: -11680.0 }, cityType: 'port' },
			{ barrack: { typeId: UNIT_ID.PORT, x: 7008.0, y: -12192.0 }, cityType: 'port' },
		],
	});
	CountrySettings.push({
		name: 'Cyprus',
		spawnerData: {
			unitData: { x: 12608.0, y: -10944.0 },
		},
		cities: [
			{ barrack: { typeId: UNIT_ID.PORT, x: 13408.0, y: -10272.0 }, cityType: 'port' },
			{ barrack: { typeId: UNIT_ID.PORT, x: 12576.0, y: -11808.0 }, cityType: 'port' },
		],
	});
	CountrySettings.push({
		name: 'Isle of Man',
		spawnerData: {
			unitData: { x: -9282.0, y: 2752.0 },
		},
		cities: [{ barrack: { x: -9000.0, y: 3265.0 } }],
	});
	CountrySettings.push({
		name: 'Normandy',
		spawnerData: {
			unitData: { x: -5312.0, y: -2490.0 },
		},
		cities: [{ barrack: { x: -6050.0, y: -2800.0 } }, { barrack: { typeId: UNIT_ID.PORT, x: -5440.0, y: -1730.0 }, cityType: 'port' }],
	});
}
