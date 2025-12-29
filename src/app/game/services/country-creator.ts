import { File } from "w3ts";
import { Coordinates } from "../../interfaces/coordinates";

export interface CityCreate {
    coords: Coordinates;
    typeId: string;
    cityType: string;
}
export class CountryCreatorTracker {
    private countries: CountryCreate[] = [];
    private unassignedCities: CityCreate[] = [];
    private unassignedSpawner: Coordinates | null = null;

    getCountries(): readonly CountryCreate[] {
        return this.countries;
    }

    getUnassignedCities(): readonly CityCreate[] {
        return this.unassignedCities;
    }

    getUnassignedSpawner(): Coordinates | null {
        return this.unassignedSpawner;
    }

    generateCountrySettings(): void {
        this.countries.forEach(country => {
            const name = country.getCountryName();
            DisplayTextToPlayer(Player(0), 0, 0, name)
            const spawner = country.getSpawner();
            const cities = country.getCities();

            const spawnerText = `spawnerData: {unitData: { x: ${spawner.x}, y: ${spawner.y} },},`


            const citiesText = cities
                .map(
                    city =>
                        `{ barrack: { typeId: ${city.typeId}, x: ${city.coords.x}, y: ${city.coords.y}}, cityType: '${city.cityType}'}`
                )
                .join();

            const fileContents =
                `CountrySettings.push({name: '${name}',${spawnerText}cities: [${citiesText}],});`;

            File.write(`risk/${name}.txt`, fileContents);
        });
    }

    findCountryByCityCoordinates(coords: Coordinates): string | null {
        for (const country of this.countries) {
            if (
                country.getCities().some(
                    city =>
                        city.coords.x === coords.x &&
                        city.coords.y === coords.y
                )
            ) {
                return country.getCountryName();
            }
        }
        return null;
    }

    addUnassignedCity(city: CityCreate): void {
        this.unassignedCities.push(city);
    }

    addUnassignedSpawner(spawner: Coordinates): void {
        this.unassignedSpawner = spawner;
    }

    createCountryFromUnassigned(
        countryName: string,
        spawner: Coordinates
    ): CountryCreate {
        const newCountry = new CountryCreate(
            countryName,
            [...this.unassignedCities],
            spawner
        );

        this.countries.push(newCountry);
        this.unassignedCities = [];
        this.unassignedSpawner = null;

        return newCountry;
    }
}


export class CountryCreate {
    private countryName: string;
    private cities: CityCreate[];
    private spawner: Coordinates | null;

    constructor(
        countryName: string,
        cities: CityCreate[] = [],
        spawner: Coordinates | null = null
    ) {
        this.countryName = countryName;
        this.cities = cities;
        this.spawner = spawner;
    }

    getCountryName(): string {
        return this.countryName;
    }

    getCities(): readonly CityCreate[] {
        return this.cities;
    }

    getSpawner(): Coordinates | null {
        return this.spawner;
    }

    addCity(city: CityCreate): void {
        this.cities.push(city);
    }

    setSpawner(coords: Coordinates): void {
        this.spawner = coords;
    }
}


export const countryTracker = new CountryCreatorTracker();
