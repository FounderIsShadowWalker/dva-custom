const createStore = (reducer, initialState) => {
    let currentReducer = reducer;
    let currentState = initialState;
    let listener = () => { };

    return {
        getState() {
            return currentState;
        },
        dispatch(action) {
            let {
                type
            } = action;
            currentState = currentReducer(currentState, action);
            listener();
            return action;
        },
        subscribe(newListener) {
            listener = newListener;
        }
    }
}

const compose = (...funcs) => {
    if (funcs.length === 0) {
        return arg => arg
    }

    if (funcs.length === 1) {
        return funcs[0]
    }

    const last = funcs[funcs.length - 1]
    const rest = funcs.slice(0, -1)
    return (...args) => rest.reduceRight((composed, f) => f(composed), last(...args));
}

const applyMiddleware = (...middlewares) => {
    return (createStore) => (reducer, initialState, enhancer) => {
        var store = createStore(reducer, initialState, enhancer)
        var dispatch = store.dispatch;
        var chain = [];
        var middlewareAPI = {
            getState: store.getState,
            dispatch: (action) => store.dispatch(action)
        }
        chain = middlewares.map(middleware => middleware(middlewareAPI))
        dispatch = compose(...chain)(store.dispatch)
        return {
            ...store,
            dispatch
        }
    }
}

const logger = store => next => action => {
    console.log('prevState', store.getState());
    let result = next(action);
    console.log('nextState', store.getState());
    return result;
};

const thunk = ({
    dispatch,
    getState
}) => next => action => {
    if (typeof action === 'function') {
        return action(dispatch, getState);
    }
    return next(action);
}

let counterModel = {

    namespace: 'counter',

    state: {
        num: 0
    },

    reducers: {
        add(state, action) {
            console.log('reducer add executed');
            return {
                num: state.num + 1
            }
        },
        asyncAdd(state, action) {
            console.log('reducer asyncAdd executed');
            return {
                num: state.num + 1
            }
        },
        test(state, action) {
            console.log('reducer test executed');
            return {
                state
            }
        }
    }
};

let userModel = {

    namespace: 'user',

    state: {
        name: 'xxxx'
    },


    reducers: {
        modify(state, {
            payload
        }) {
            console.log('reducer modify executed');
            let {
                name
            } = payload
            return {
                name
            }
        }
    }
};

const combineReducer = (reducers) => (state = {}, action) => {
    let {
        type
    } = action;
    let stateKey = type.split('/')[0];
    let reducer = type.split('/')[1];

    reducers.map((current) => {
        if (current.name === reducer) {
            state[stateKey] = current(state[stateKey], action);
        }
    });

    return state;
}

class dva {
    constructor() {
        this._models = [];
        this._reducers = [];
        this._states = {};
    }
    model(model) {
        this._models.push(model);
    }
    start() {
        for (var i = 0; i < this._models.length; i++) {
            this._states[this._models[i].namespace] = {
                ...this._models[i].state
            };
            Object.keys(this._models[i].reducers).map((key) => {
                if (this._models[i].reducers.hasOwnProperty(key)) {
                    this._reducers.push(this._models[i].reducers[key]);
                }
            })

        }
        var rootReducer = combineReducer(this._reducers);
        let createStoreWithMiddleware = applyMiddleware(thunk, logger)(createStore);
        this._store = createStoreWithMiddleware(rootReducer, this._states);
        this._store.subscribe(() => {
            console.log(this._store.getState());
        })
    }
}

var app = new dva();
app.model(counterModel);
app.model(userModel);

app.start();
app._store.dispatch({
    type: 'counter/add'
});

app._store.dispatch({
    type: 'user/modify',
    payload: {
        name: 'shadow'
    }
})

app._store.dispatch((dispatch, getState) => {
    console.log('异步前 时间', new Date());
    setTimeout(() => {
        dispatch({
            type: 'counter/asyncAdd'
        })
        console.log('异步后 时间', new Date());
    }, 5000);
})