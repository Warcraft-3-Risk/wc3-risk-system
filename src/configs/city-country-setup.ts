import { CityType } from 'src/app/city/city-type';
import { ICountryData } from 'src/app/country/builder/country-data.interface';

export function SetCountries(countryData: ICountryData[]) {
	countryData.push({
		name: 'Germany',
		spawnerSettings: {
			x: -960.0,
			y: -1088.0,
		},
		cities: [
			{ x: 320, y: 320 },
			{ x: -832.0, y: 64.0 },
			{ x: 320, y: -1024.0 },
			{ x: -1472.0, y: -1024.0 },
			{ x: -1408.0, y: -2432.0 },
			{ x: -384.0, y: -2944.0 },
		],
	});
	countryData.push({
		name: 'Poland',
		spawnerSettings: {
			x: 2752.0,
			y: -64.0,
		},
		cities: [
			{ x: 3584.0, y: 128.0 },
			{ x: 1664.0, y: -384.0 },
			{ x: 2048.0, y: 832.0 },
			{ x: 4032.0, y: -1152.0 },
		],
	});
	countryData.push({
		name: 'Czech Republic',
		spawnerSettings: {
			x: 1216.0,
			y: -1984.0,
		},
		cities: [
			{ x: 768.0, y: -2048.0 },
			{ x: 2112.0, y: -1664.0 },
		],
	});
	countryData.push({
		name: 'Austria',
		spawnerSettings: {
			x: 832.0,
			y: -3392.0,
		},
		cities: [
			{ x: 1408.0, y: -3008.0 },
			{ x: 448.0, y: -3648.0 },
		],
	});
	countryData.push({
		name: 'Slovenia',
		spawnerSettings: {
			x: 1216.0,
			y: -4544.0,
		},
		cities: [
			{ x: 1856.0, y: -4032.0 },
			{ x: 896.0, y: -4736.0 },
		],
	});
	countryData.push({
		name: 'Croatia',
		spawnerSettings: {
			x: 2112.0,
			y: -5056.0,
		},
		cities: [
			{ x: 2880.0, y: -4864.0 },
			{ x: 1920.0, y: -5760.0 },
		],
	});
	countryData.push({
		name: 'Bosnia',
		spawnerSettings: {
			x: 3008.0,
			y: -6080.0,
		},
		cities: [
			{ x: 3456.0, y: -5632.0 },
			{ x: 2752.0, y: -6656.0 },
		],
	});
	countryData.push({
		name: 'Montenegro',
		spawnerSettings: {
			x: 4032.0,
			y: -6976.0,
		},
		cities: [
			{ x: 3776.0, y: -6656.0 },
			{ x: 4736.0, y: -6720.0 },
		],
	});
	countryData.push({
		name: 'Serbia',
		spawnerSettings: {
			x: 4416.0,
			y: -5696.0,
		},
		cities: [
			{ x: 4416.0, y: -4992.0 },
			{ x: 5248.0, y: -5568.0 },
		],
	});
	countryData.push({
		name: 'Macedonia',
		spawnerSettings: {
			x: 5056.0,
			y: -7488.0,
		},
		cities: [
			{ x: 5952.0, y: -6848.0 },
			{ x: 5440.0, y: -7872.0 },
		],
	});
	countryData.push({
		name: 'Albania',
		spawnerSettings: {
			x: 4160.0,
			y: -8128.0,
		},
		cities: [
			{ x: 4736.0, y: -8768.0 },
			{ x: 3600.0, y: -8017.0, cityType: CityType.Port },
		],
	});
	countryData.push({
		name: 'Greece',
		spawnerSettings: {
			x: 5696.0,
			y: -9024.0,
		},
		cities: [
			{ x: 7168.0, y: -7616.0 },
			{ x: 6112.0, y: -11232.0, cityType: CityType.Port },
			{ x: 6464.0, y: -9472.0 },
			{ x: 5504.0, y: -9536.0 },
		],
	});
	countryData.push({
		name: 'Bulgaria',
		spawnerSettings: {
			x: 6976.0,
			y: -6464.0,
		},
		cities: [
			{ x: 6784.0, y: -6016.0 },
			{ x: 7808.0, y: -5952.0 },
		],
	});
	countryData.push({
		name: 'Romania',
		spawnerSettings: {
			x: 6080.0,
			y: -4288.0,
		},
		cities: [
			{ x: 5184.0, y: -3968.0 },
			{ x: 6144.0, y: -4864.0 },
			{ x: 7616.0, y: -4672.0 },
			{ x: 6528.0, y: -3456.0 },
		],
	});
	countryData.push({
		name: 'Moldova',
		spawnerSettings: {
			x: 7744.0,
			y: -2880.0,
		},
		cities: [
			{ x: 7296.0, y: -2496.0 },
			{ x: 8384.0, y: -3136.0 },
		],
	});
	countryData.push({
		name: 'Ukraine',
		spawnerSettings: {
			x: 8256.0,
			y: -1216.0,
		},
		cities: [
			{ x: 6080.0, y: -2048.0 },
			{ x: 5696.0, y: -1024.0 },
			{ x: 7232.0, y: -832.0 },
			{ x: 9344.0, y: -1984.0 },
			{ x: 10240.0, y: -384.0 },
			{ x: 11328.0, y: -1664.0 },
		],
	});
	countryData.push({
		name: 'Turkey',
		spawnerSettings: {
			x: 12864.0,
			y: -7232.0,
		},
		cities: [
			{ x: 10048.0, y: -9280.0 },
			{ x: 11072.0, y: -7168.0 },
			{ x: 12288.0, y: -8192.0 },
			{ x: 16704.0, y: -6080.0 },
			{ x: 15424.0, y: -7360.0 },
			{ x: 11360.0, y: -10336.0, cityType: CityType.Port },
			{ x: 8800.0, y: -7392.0, cityType: CityType.Port },
		],
	});
	countryData.push({
		name: 'Georgia',
		spawnerSettings: {
			x: 15424.0,
			y: -4032.0,
		},
		cities: [
			{ x: 16064.0, y: -4096.0 },
			{ x: 14976.0, y: -3648.0 },
		],
	});
	countryData.push({
		name: 'Syria',
		spawnerSettings: {
			x: 16704.0,
			y: -10048.0,
		},
		cities: [
			{ x: 17472.0, y: -9664.0 },
			{ x: 16064.0, y: -9408.0 },
			{ x: 16512.0, y: -10800.0 },
		],
	});
	countryData.push({
		name: 'Lebanon',
		spawnerSettings: {
			x: 14784.0,
			y: -10304.0,
		},
		cities: [
			{ x: 14784.0, y: -9600.0 },
			{ x: 14976.0, y: -11136.0 },
		],
	});
	countryData.push({
		name: 'Palestine',
		spawnerSettings: {
			x: 16192.0,
			y: -12480.0,
		},
		cities: [{ x: 15808.0, y: -12224.0 }],
	});
	countryData.push({
		name: 'Israel',
		spawnerSettings: {
			x: 14656.0,
			y: -12736.0,
		},
		cities: [
			{ x: 14976.0, y: -13440.0 },
			{ x: 13900.0, y: -12320.0, cityType: CityType.Port },
		],
	});
	countryData.push({
		name: 'Jordan',
		spawnerSettings: {
			x: 16960.0,
			y: -13504.0,
		},
		cities: [
			{ x: 17344.0, y: -12480.0 },
			{ x: 17728.0, y: -13440.0 },
			{ x: 16128.0, y: -14272.0 },
		],
	});
	countryData.push({
		name: 'Egypt',
		spawnerSettings: {
			x: 11072.0,
			y: -14912.0,
		},
		cities: [
			{ x: 14400.0, y: -14784.0 },
			{ x: 12480.0, y: -14080.0 },
			{ x: 12928.0, y: -15104.0 },
			{ x: 9408.0, y: -15104.0 },
		],
	});
	countryData.push({
		name: 'Lybia',
		spawnerSettings: {
			x: 6976.0,
			y: -14912.0,
		},
		cities: [
			{ x: 7680.0, y: -14528.0 },
			{ x: 6208.0, y: -15040.0 },
			{ x: 5088.0, y: -14112.0, cityType: CityType.Port },
		],
	});
	countryData.push({
		name: 'Tunisia',
		spawnerSettings: {
			x: -1728.0,
			y: -14400.0,
		},
		cities: [
			{ x: -1408.0, y: -13824.0 },
			{ x: -160.0, y: -14496.0, cityType: CityType.Port },
		],
	});
	countryData.push({
		name: 'Algeria',
		spawnerSettings: {
			x: -5312.0,
			y: -14272.0,
		},
		cities: [
			{ x: -3648.0, y: -14144.0 },
			{ x: -5760.0, y: -15040.0 },
			{ x: -7360.0, y: -14336.0 },
		],
	});
	countryData.push({
		name: 'Morocco',
		spawnerSettings: {
			x: -10176.0,
			y: -14400.0,
		},
		cities: [
			{ x: -8832.0, y: -15104.0 },
			{ x: -10688.0, y: -14080.0 },
			{ x: -12320.0, y: -14368.0, cityType: CityType.Port },
		],
	});
	countryData.push({
		name: 'Portugal',
		spawnerSettings: {
			x: -11200.0,
			y: -8128.0,
		},
		cities: [
			{ x: -11328.0, y: -9600.0 },
			{ x: -10624.0, y: -7296.0 },
			{ x: -12000.0, y: -7968.0, cityType: CityType.Port },
		],
	});
	countryData.push({
		name: 'Spain',
		spawnerSettings: {
			x: -8896.0,
			y: -8384.0,
		},
		cities: [
			{ x: -9728.0, y: -10240.0 },
			{ x: -9408.0, y: -8192.0 },
			{ x: -7616.0, y: -6976.0 },
			{ x: -10112.0, y: -5972.0 },
			{ x: -8035.0, y: -9572.0 },
		],
	});
	countryData.push({
		name: 'Catalonia',
		spawnerSettings: {
			x: -7104,
			y: -8640,
		},
		cities: [
			{ x: -6450.0, y: -7835.0 },
			{ x: -6634.0, y: -9181.0, cityType: CityType.Port },
		],
	});
	countryData.push({
		name: 'France',
		spawnerSettings: {
			x: -5056.0,
			y: -4288.0,
		},
		cities: [
			{ x: -5504.0, y: -6272.0 },
			{ x: -5440.0, y: -5120.0 },
			{ x: -3584.0, y: -5568.0 },
			{ x: -3520.0, y: -3776.0 },
			{ x: -4800.0, y: -3136.0 },
			{ x: -6336.0, y: -3456.0 },
			{ x: -6944.0, y: -4704.0, cityType: CityType.Port },
			{ x: -4384.0, y: -7008.0, cityType: CityType.Port },
		],
	});
	countryData.push({
		name: 'Switzerland',
		spawnerSettings: {
			x: -1856.0,
			y: -4288.0,
		},
		cities: [
			{ x: -2432.0, y: -4160.0 },
			{ x: -1280.0, y: -4352.0 },
		],
	});
	countryData.push({
		name: 'Northern Italy',
		spawnerSettings: {
			x: -1086.0,
			y: -5567.0,
		},
		cities: [
			{ x: -1856.0, y: -5440.0 },
			{ x: -272.0, y: -6752.0 },
			{ x: -109.0, y: -5507.0, cityType: CityType.Port },
		],
	});
	countryData.push({
		name: 'Southern Italy',
		spawnerSettings: {
			x: 1728.0,
			y: -8507.0,
		},
		cities: [
			{ x: 1329.0, y: -7928.0 },
			{ x: 1923.0, y: -9244.0 },
		],
	});
	countryData.push({
		name: 'Belgium',
		spawnerSettings: {
			x: -3648.0,
			y: -1856.0,
		},
		cities: [
			{ x: -3072.0, y: -2368.0 },
			{ x: -4384.0, y: -608.0, cityType: CityType.Port },
		],
	});
	countryData.push({
		name: 'Netherlands',
		spawnerSettings: {
			x: -3008.0,
			y: -448.0,
		},
		cities: [
			{ x: -3200.0, y: -1024.0 },
			{ x: -2368.0, y: -128.0 },
			{ x: -3168.0, y: 480.0, cityType: CityType.Port },
		],
	});
	countryData.push({
		name: 'Denmark',
		spawnerSettings: {
			x: -1344.0,
			y: 1600.0,
		},
		cities: [
			{ x: -960.0, y: 1408.0 },
			{ x: -1088.0, y: 2560.0 },
			{ x: -2272.0, y: 2464.0, cityType: CityType.Port },
		],
	});
	countryData.push({
		name: 'Norway',
		spawnerSettings: {
			x: -1344.0,
			y: 6336.0,
		},
		cities: [
			{ x: -1856.0, y: 5056.0 },
			{ x: -768.0, y: 5312.0 },
			{ x: -640.0, y: 7232.0 },
			{ x: 576.0, y: 10112.0 },
			{ x: 1728.0, y: 12224.0 },
			{ x: -2464.0, y: 3680.0, cityType: CityType.Port },
			{ x: -1760.0, y: 7904.0, cityType: CityType.Port },
		],
	});
	countryData.push({
		name: 'Sweden',
		spawnerSettings: {
			x: 704.0,
			y: 7744.0,
		},
		cities: [
			{ x: 1856.0, y: 10240.0 },
			{ x: 1216.0, y: 8704.0 },
			{ x: 576.0, y: 6400.0 },
			{ x: 512.0, y: 3392.0 },
			{ x: 1760.0, y: 3040.0, cityType: CityType.Port },
		],
	});
	countryData.push({
		name: 'Finland',
		spawnerSettings: {
			x: 3648.0,
			y: 7744.0,
		},
		cities: [
			{ x: 3968.0, y: 11584.0 },
			{ x: 4800.0, y: 10368.0 },
			{ x: 4480.0, y: 8448.0 },
			{ x: 4096.0, y: 6848.0 },
			{ x: 3424.0, y: 9184.0, cityType: CityType.Port },
		],
	});
	countryData.push({
		name: 'England',
		spawnerSettings: {
			x: -6848.0,
			y: 832.0,
		},
		cities: [
			{ x: -6528.0, y: 256.0 },
			{ x: -6784.0, y: 1600.0 },
			{ x: -7040.0, y: 3200.0 },
			{ x: -8352.0, y: -672.0, cityType: CityType.Port },
		],
	});
	countryData.push({
		name: 'Ireland',
		spawnerSettings: {
			x: -11584.0,
			y: 2112.0,
		},
		cities: [
			{ x: -11136.0, y: 2368.0 },
			{ x: -10208.0, y: 4000.0, cityType: CityType.Port },
			{ x: -11488.0, y: 800.0, cityType: CityType.Port },
		],
	});
	countryData.push({
		name: 'Iceland',
		spawnerSettings: {
			x: -7360.0,
			y: 9664.0,
		},
		cities: [
			{ x: -6592.0, y: 9344.0 },
			{ x: -7936.0, y: 9792.0 },
			{ x: -7200.0, y: 7968.0, cityType: CityType.Port },
			{ x: -5920.0, y: 10464.0, cityType: CityType.Port },
		],
	});
	countryData.push({
		name: 'Svalbard',
		spawnerSettings: {
			x: -1088.0,
			y: 14784.0,
		},
		cities: [
			{ x: -576.0, y: 14912.0 },
			{ x: -1760.0, y: 14496.0, cityType: CityType.Port },
		],
	});
	countryData.push({
		name: 'Estonia',
		spawnerSettings: {
			x: 4544.0,
			y: 4928.0,
		},
		cities: [
			{ x: 5056.0, y: 5312.0 },
			{ x: 4128.0, y: 4640.0, cityType: CityType.Port },
		],
	});
	countryData.push({
		name: 'Latvia',
		spawnerSettings: {
			x: 4672.0,
			y: 3776.0,
		},
		cities: [
			{ x: 5440.0, y: 3520.0 },
			{ x: 3104.0, y: 3616.0, cityType: CityType.Port },
		],
	});
	countryData.push({
		name: 'Lithuania',
		spawnerSettings: {
			x: 4672.0,
			y: 2368.0,
		},
		cities: [
			{ x: 5312.0, y: 2048.0 },
			{ x: 4160.0, y: 2496.0 },
		],
	});
	countryData.push({
		name: 'Kaliningrad',
		spawnerSettings: {
			x: 3520.0,
			y: 1472.0,
		},
		cities: [
			{ x: 4096.0, y: 1344.0 },
			{ x: 2976.0, y: 1952.0, cityType: CityType.Port },
		],
	});
	countryData.push({
		name: 'Belarus',
		spawnerSettings: {
			x: 6336.0,
			y: 1216.0,
		},
		cities: [
			{ x: 6912.0, y: 2560.0 },
			{ x: 6912.0, y: 1472.0 },
			{ x: 7680.0, y: 512.0 },
			{ x: 5376.0, y: 384.0 },
		],
	});
	countryData.push({
		name: 'Malta',
		spawnerSettings: {
			x: 1216.0,
			y: -12992.0,
		},
		cities: [
			{ x: 896.0, y: -13120.0 },
			{ x: 2410.0, y: -12836.0, cityType: CityType.Port },
		],
	});

	countryData.push({
		name: 'Karelia',
		spawnerSettings: {
			x: 6592,
			y: 8896,
		},
		cities: [
			{ x: 7680.0, y: 8960.0 },
			{ x: 5824.0, y: 9728.0 },
			{ x: 6144.0, y: 12416.0 },
			{ x: 6880.0, y: 10464.0, cityType: CityType.Port },
		],
	});
	countryData.push({
		name: 'Leningrad',
		spawnerSettings: {
			x: 7872,
			y: 5440,
		},
		cities: [
			{ x: 6848.0, y: 4672.0 },
			{ x: 8896.0, y: 6080.0 },
			{ x: 6048.0, y: 6112.0, cityType: CityType.Port },
		],
	});
	countryData.push({
		name: 'Arkhangelsk',
		spawnerSettings: {
			x: 10688,
			y: 9536,
		},
		cities: [
			{ x: 12160.0, y: 7872.0 },
			{ x: 9408.0, y: 8448.0 },
			{ x: 9920.0, y: 10880.0 },
		],
	});
	countryData.push({
		name: 'North Russia',
		spawnerSettings: {
			x: 14144,
			y: 12736,
		},
		cities: [
			{ x: 17920.0, y: 13888.0 },
			{ x: 13440.0, y: 11520.0 },
			{ x: 12544.0, y: 13376.0 },
			{ x: 14976.0, y: 14016.0 },
			{ x: 17408.0, y: 10496.0 },
		],
	});

	countryData.push({
		name: 'Slovakia',
		spawnerSettings: {
			x: 3136.0,
			y: -2496.0,
		},
		cities: [
			{ x: 3968.0, y: -2304.0 },
			{ x: 2752.0, y: -2624.0 },
		],
	});
	countryData.push({
		name: 'Hungary',
		spawnerSettings: {
			x: 3520.0,
			y: -3776.0,
		},
		cities: [
			{ x: 4416.0, y: -3200.0 },
			{ x: 3136.0, y: -3776.0 },
		],
	});
	countryData.push({
		name: 'Sicily',
		spawnerSettings: {
			x: 960.0,
			y: -10816.0,
		},
		cities: [
			{ x: 450.0, y: -10368.0 },
			{ x: 1238.0, y: -11566.0, cityType: CityType.Port },
		],
	});
	countryData.push({
		name: 'Disko Bay',
		spawnerSettings: {
			x: -11072.0,
			y: 14272.0,
		},
		cities: [
			{ x: -11584.0, y: 14400.0 },
			{ x: -10432.0, y: 15104.0 },
			{ x: -11040.0, y: 12960.0, cityType: CityType.Port },
		],
	});
	countryData.push({
		name: 'East Greenland',
		spawnerSettings: {
			x: -6464.0,
			y: 14784.0,
		},
		cities: [
			{ x: -6016.0, y: 15424.0 },
			{ x: -5600.0, y: 14048.0, cityType: CityType.Port },
		],
	});
	countryData.push({
		name: 'Sami',
		spawnerSettings: {
			x: 3776.0,
			y: 13376.0,
		},
		cities: [
			{ x: 3264.0, y: 13504.0 },
			{ x: 4160.0, y: 13056.0 },
		],
	});
	countryData.push({
		name: 'Scotland',
		spawnerSettings: {
			x: -7488.0,
			y: 5056.0,
		},
		cities: [
			{ x: -7950.0, y: 4672.0 },
			{ x: -7552.0, y: 5952.0 },
			{ x: -6432.0, y: 4960.0, cityType: CityType.Port },
		],
	});
	countryData.push({
		name: 'Novaya',
		spawnerSettings: {
			x: 10816.0,
			y: 15808.0,
		},
		cities: [
			{ x: 10496.0, y: 16064.0 },
			{ x: 11936.0, y: 15584.0, cityType: CityType.Port },
		],
	});
	countryData.push({
		name: 'Crimea',
		spawnerSettings: {
			x: 10944.0,
			y: -3904.0,
		},
		cities: [
			{ x: 11456.0, y: -3264.0 },
			{ x: 10464.0, y: -4128.0, cityType: CityType.Port },
		],
	});
	countryData.push({
		name: 'Azerbaijan',
		spawnerSettings: {
			x: 17984.0,
			y: -4288.0,
		},
		cities: [
			{ x: 18332.0, y: -3484.0 },
			{ x: 17472.0, y: -4352.0 },
		],
	});
	countryData.push({
		name: 'Armenia',
		spawnerSettings: {
			x: 17984.0,
			y: -5952.0,
		},
		cities: [{ x: 18432.0, y: -5888.0 }],
	});
	countryData.push({
		name: 'Southern Russia',
		spawnerSettings: {
			x: 15936.0,
			y: -320.0,
		},
		cities: [
			{ x: 14400.0, y: -1856.0 },
			{ x: 14848.0, y: 1216.0 },
			{ x: 16704.0, y: 1088.0 },
			{ x: 17088.0, y: -1152.0 },
			{ x: 13024.0, y: -3808.0, cityType: CityType.Port },
		],
	});
	countryData.push({
		name: 'Volga',
		spawnerSettings: {
			x: 17088.0,
			y: 5184.0,
		},
		cities: [
			{ x: 15424.0, y: 5376.0 },
			{ x: 18048.0, y: 6720.0 },
			{ x: 17984.0, y: 3840.0 },
		],
	});
	countryData.push({
		name: 'Central Russia',
		spawnerSettings: {
			x: 11584.0,
			y: 3392.0,
		},
		cities: [
			{ x: 8640.0, y: 3264.0 },
			{ x: 10496.0, y: 1536.0 },
			{ x: 13056.0, y: 2496.0 },
			{ x: 11264.0, y: 3968.0 },
			{ x: 12864.0, y: 5632.0 },
		],
	});
	countryData.push({
		name: 'Siberia',
		spawnerSettings: {
			x: 17216.0,
			y: 15424.0,
		},
		cities: [
			{ x: 16576.0, y: 15744.0 },
			{ x: 18176.0, y: 15616.0 },
		],
	});
	countryData.push({
		name: 'Moscow',
		spawnerSettings: {
			x: 14528.0,
			y: 8768.0,
		},
		cities: [
			{ x: 15296.0, y: 8960.0 },
			{ x: 13952.0, y: 8384.0 },
		],
	});
	countryData.push({
		name: 'National Park',
		spawnerSettings: {
			x: -8640.0,
			y: 14400.0,
		},
		cities: [
			{ x: -8768.0, y: 15232.0 },
			{ x: -7936.0, y: 14336.0 },
			{ x: -9262.0, y: 13906.0 },
		],
	});
	countryData.push({
		name: 'West Greenland',
		spawnerSettings: {
			x: -12864.0,
			y: 13888.0,
		},
		cities: [
			{ x: -12736.0, y: 14976.0 },
			{ x: -12352.0, y: 13320.0 },
		],
	});
	countryData.push({
		name: 'Wales',
		spawnerSettings: {
			x: -8384.0,
			y: 1472.0,
		},
		cities: [
			{ x: -8000.0, y: 2304.0 },
			{ x: -8512.0, y: 1216.0 },
		],
	});
	countryData.push({
		name: 'Corse',
		spawnerSettings: {
			x: -1857.0,
			y: -8135.0,
		},
		cities: [
			{ x: -2117.0, y: -7724.0 },
			{ x: -1250.0, y: -8326.0, cityType: CityType.Port },
		],
	});
	countryData.push({
		name: 'Sardinia',
		spawnerSettings: {
			x: -1987.0,
			y: -9927.0,
		},
		cities: [
			{ x: -2305.0, y: -9428.0 },
			{ x: -1758.0, y: -10512.0, cityType: CityType.Port },
		],
	});
	countryData.push({
		name: 'Crete',
		spawnerSettings: {
			x: 7616.0,
			y: -11712.0,
		},
		cities: [
			{ x: 8864.0, y: -11680.0, cityType: CityType.Port },
			{ x: 7008.0, y: -12192.0, cityType: CityType.Port },
		],
	});
	countryData.push({
		name: 'Cyprus',
		spawnerSettings: {
			x: 12608.0,
			y: -10944.0,
		},
		cities: [
			{ x: 13408.0, y: -10272.0, cityType: CityType.Port },
			{ x: 12576.0, y: -11808.0, cityType: CityType.Port },
		],
	});
}
