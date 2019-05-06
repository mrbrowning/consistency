export const LINEARIZABLE = "linearizable";
export const SEQUENTIAL = "sequential";
export const SERIALIZABLE = "serializable";
export const CONSISTENCY_LEVELS = [LINEARIZABLE, SEQUENTIAL, SERIALIZABLE];

export const READ_OP = "READ";
export const WRITE_OP = "WRITE";
export const CAS_OP = "CAS";
export const OPERATION_SYMBOLS = {
  READ: "r",
  WRITE: "w",
  CAS: "s",
};

export const CLIENT_A_PID = 0;
export const CLIENT_B_PID = 1;

export const histories = [
    {
        consistencyLevel: LINEARIZABLE,
        events: [
            {
                id: 0,
                clientSend: 0,
                clientAck: 10,
                systemTime: 5,
                clientOperation: WRITE_OP,
                opValue: 3,
                clientPid: CLIENT_A_PID,
            },
            {
                id: 1,
                clientSend: 15,
                clientAck: 23,
                systemTime: 18,
                clientOperation: READ_OP,
                opValue: 3,
                clientPid: CLIENT_A_PID,
            },
            {
                id: 2,
                clientSend: 25,
                clientAck: 40,
                systemTime: 30,
                clientOperation: WRITE_OP,
                opValue: 2,
                clientPid: CLIENT_B_PID,
            },
            {
                id: 3,
                clientSend: 30,
                clientAck: 40,
                systemTime: 35,
                clientOperation: CAS_OP,
                opValue: [2, 3],
                clientPid: CLIENT_A_PID,
            },
            {
                id: 4,
                clientSend: 60,
                clientAck: 80,
                systemTime: 65,
                clientOperation: WRITE_OP,
                opValue: 4,
                clientPid: CLIENT_A_PID,
            }
        ]
    }
];

export const relativisticHistories = histories;