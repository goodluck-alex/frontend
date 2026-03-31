import Peer from "simple-peer";

export const createPeer = (stream, initiator) => {
  return new Peer({
    initiator,
    trickle: false,
    stream
  });
};