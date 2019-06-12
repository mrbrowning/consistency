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
                clientAck: 25,
                systemTime: 18,
                clientOperation: READ_OP,
                opValue: 3,
                clientPid: CLIENT_A_PID,
            },
            {
                id: 2,
                clientSend: 17,
                clientAck: 35,
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
                clientOperation: READ_OP,
                opValue: 2,
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
    },
    {
        consistencyLevel: SERIALIZABLE,
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
    },
    {
        consistencyLevel: SERIALIZABLE,
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
                clientOperation: CAS_OP,
                opValue: [3, 2],
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
                clientSend: 50,
                clientAck: 60,
                systemTime: 52,
                clientOperation: CAS_OP,
                opValue: [3, 4],
                clientPid: CLIENT_A_PID,
            },
            {
                id: 5,
                clientSend: 50,
                clientAck: 60,
                systemTime: 57,
                clientOperation: CAS_OP,
                opValue: [4, 5],
                clientPid: CLIENT_B_PID,
            },
            {
                id: 6,
                clientSend: 70,
                clientAck: 80,
                systemTime: 75,
                clientOperation: CAS_OP,
                opValue: [5, 6],
                clientPid: CLIENT_A_PID,
            }
        ]
    }
];

export const relativisticHistories = [
    {
        consistencyLevel: LINEARIZABLE,
        events: [
            { id: 0,
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
                clientAck: 25,
                systemTime: 18,
                clientOperation: READ_OP,
                opValue: 3,
                clientPid: CLIENT_A_PID,
            },
            {
                id: 2,
                clientSend: 17,
                clientAck: 35,
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
                clientOperation: READ_OP,
                opValue: 2,
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