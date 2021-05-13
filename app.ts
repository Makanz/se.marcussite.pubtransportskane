import Homey from 'homey';
import fetch from 'node-fetch';

const trigger_departure = 'skanetransport_trigger_next_departure';
const action_next_departure = 'skanetransport_find_next_departure';
const action_check_departure = 'skanetransport_check_departure';

class PubtransportSkane extends Homey.App {
    _departureTrigger!: Homey.FlowCardTrigger;
    _departureActionNextDeparture!: Homey.FlowCardAction;
    _departureActionCheckDeparture!: Homey.FlowCardAction;
    async onInit(): Promise<void> {
        this.log('Public transport is running...');

        // Register FlowCardTrigger
        this._departureTrigger =
            this.homey.flow.getTriggerCard(trigger_departure);

        // Register FlowCardAction
        this._departureActionNextDeparture = this.homey.flow.getActionCard(
            action_next_departure
        );
        this._departureActionNextDeparture.registerRunListener(
            async (args: {
                stationFrom: { name: string; id: string };
                stationTo: { name: string; id: string };
            }) => {
                // Find route and get next departure
                this.log(
                    `Find route and get next departure: ${args.stationFrom.name} | ${args.stationFrom.id} - ${args.stationTo.name} | ${args.stationTo.id}`
                );

                return await this.getNextDeparture(
                    args.stationFrom,
                    args.stationTo,
                    new Date().toTimeString().substr(0, 5)
                );
            }
        );

        // Get arguments from "Station from" on action card
        this._departureActionNextDeparture
            .getArgument('stationFrom')
            .registerAutocompleteListener((query: string) => {
                this.log(query);

                if (query.length >= 3) {
                    return this.stationAutoComplete(query);
                }
            });

        // Get arguments from "Station to" on action card
        this._departureActionNextDeparture
            .getArgument('stationTo')
            .registerAutocompleteListener((query: string) => {
                this.log(query);

                if (query.length >= 3) {
                    return this.stationAutoComplete(query);
                }
            });

        this._departureActionCheckDeparture = this.homey.flow.getActionCard(
            action_check_departure
        );
        this._departureActionCheckDeparture.registerRunListener(
            async (args: {
                stationFrom: { name: string; id: string };
                stationTo: { name: string; id: string };
            }) => {
                // Find route and get next departure
                this.log(
                    `Find route and get next departure: ${args.stationFrom.name} | ${args.stationFrom.id} - ${args.stationTo.name} | ${args.stationTo.id}`
                );

                return await this.getNextDeparture(
                    args.stationFrom,
                    args.stationTo,
                    ''
                );
            }
        );

        // Get arguments from "Station from" on action card
        this._departureActionCheckDeparture
            .getArgument('stationFrom')
            .registerAutocompleteListener((query: string) => {
                this.log(query);

                if (query.length >= 3) {
                    return this.stationAutoComplete(query);
                }
            });

        // Get arguments from "Station to" on action card
        this._departureActionCheckDeparture
            .getArgument('stationTo')
            .registerAutocompleteListener((query: string) => {
                this.log(query);

                if (query.length >= 3) {
                    return this.stationAutoComplete(query);
                }
            });
    }

    stationAutoComplete(query: string) {
        return new Promise((resolve, reject) => {
            const apiUrl =
                'https://api.resrobot.se/location.name.json?key=54bf99d9-c02e-472c-8dd3-40c6fe37fb21&input=' +
                encodeURIComponent(query);
            fetch(apiUrl)
                .then((res) => res.json())
                .then((response) => {
                    this.log(response.StopLocation);

                    if (response.StopLocation.length > 0) {
                        const searchResult = response.StopLocation.map(
                            (busStop: any) => {
                                return {
                                    name: busStop.name,
                                    id: busStop.id
                                };
                            }
                        );
                        resolve(searchResult);
                    } else {
                        resolve([{ name: 'Nothing found!' }]);
                    }
                })
                .catch((error) => {
                    reject(error);
                });
        });
    }

    async getNextDeparture(
        from: { name: string; id: string },
        to: { name: string; id: string },
        time: string
    ) {
        // Create api-url
        const apiUrl =
            'https://api.resrobot.se/v2/trip?key=54bf99d9-c02e-472c-8dd3-40c6fe37fb21&originId=' +
            from.id +
            '&destId=' +
            to.id +
            '&format=json';
        this.log(apiUrl);

        const route = {
            name: '',
            time: null
        };

        await fetch(apiUrl)
            .then((res) => res.json())
            .then((response) => {
                response.Trip.forEach((trip: any) => {
                    const leg = trip.LegList.Leg[0];
                    if (leg.type !== 'WALK') {
                        // Build return object
                        route.name = leg.name;
                        route.time = leg.Origin.time;
                        return;
                    }
                });
            });

        const tokens = {
            route_name: route.name,
            next_departure: route.time,
            delayed: false
        };

        this.log('Tokens', tokens);

        // Trigger flowcard with tokens
        this._departureTrigger
            .trigger(tokens, tokens)
            .then(this.log)
            .catch(this.error);
    }
}

module.exports = PubtransportSkane;
