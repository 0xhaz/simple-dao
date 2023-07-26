import Web3 from "web3";
import { setGlobalState, getGlobalState } from "../store";

const { ethereum } = window as any;
window.web3 = new Web3(ethereum);
window.web3 = new Web3(window.web3.currentProvider);
