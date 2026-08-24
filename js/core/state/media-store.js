export const initialMediaState = {
    library: { movies: [], series: [], games: [] },
    watchlist: [],
    ratings: {},
    dateRatings: {},
    dateRoute: [],
    route: [],
    watchHistory: {},
    movieHistory: {},
    factsLibrary: { octopus: [], owl: [], raccoon: [], fun: [], penis: [] },
    factFavorites: []
};

export class MediaStore {
    constructor() {
        this.library = { movies: [], series: [], games: [] };
        this.watchlist = [];
        this.ratings = {};
        this.dateRatings = {};
        this.dateRoute = [];
        this.route = [];
        this.watchHistory = {};
        this.movieHistory = {};
        this.factsLibrary = { ...initialMediaState.factsLibrary };
        this.factFavorites = [];
    }
}
