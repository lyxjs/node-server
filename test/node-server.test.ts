import { NodeServer, createServer } from '../src/node-server'

describe('NodeServer test', () => {
  it('works if true is truthy', () => {
    expect(true).toBeTruthy()
  })

  it('NodeServer is instantiable', () => {
    expect(new NodeServer({})).toBeInstanceOf(NodeServer)
    expect(createServer({})).toBeInstanceOf(NodeServer)
  })
})
