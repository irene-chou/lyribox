import { describe, it, expect } from 'vitest'
import { StretchPlayer, type StretchNodeLike } from '../stretch-player'

interface Call { method: string; args: unknown[] }

function fakeNode() {
  const calls: Call[] = []
  const record = (method: string) => (...args: unknown[]) => {
    calls.push({ method, args })
    return Promise.resolve(0)
  }
  const node = {
    inputTime: 0,
    addBuffers: record('addBuffers'),
    dropBuffers: record('dropBuffers'),
    schedule: record('schedule'),
    start: record('start'),
    stop: record('stop'),
    setUpdateInterval: record('setUpdateInterval'),
    connect: () => {},
    disconnect: () => {},
  } as unknown as StretchNodeLike & { inputTime: number }
  return { node, calls }
}

const clock = { currentTime: 10 }

describe('StretchPlayer', () => {
  it('load drops old buffers before adding the new channels', async () => {
    const { node, calls } = fakeNode()
    const player = new StretchPlayer(node, clock)
    const left = new Float32Array([1, 2])
    const right = new Float32Array([3, 4])

    await player.load([left, right])

    expect(calls.map((c) => c.method)).toEqual(['dropBuffers', 'addBuffers'])
    expect(calls[1].args[0]).toEqual([left, right])
  })

  it('start schedules playback from the given offset and pitch', async () => {
    const { node, calls } = fakeNode()
    const player = new StretchPlayer(node, clock)

    await player.start(12.5, 3)

    expect(calls).toHaveLength(1)
    expect(calls[0].method).toBe('schedule')
    expect(calls[0].args[0]).toMatchObject({ active: true, input: 12.5, rate: 1, semitones: 3 })
  })

  it('setSemitones changes pitch without touching the playback position', async () => {
    const { node, calls } = fakeNode()
    const player = new StretchPlayer(node, clock)

    await player.setSemitones(-2)

    expect(calls[0].method).toBe('schedule')
    expect(calls[0].args[0]).toEqual({ semitones: -2 })
  })

  it('stop deactivates processing', async () => {
    const { node, calls } = fakeNode()
    const player = new StretchPlayer(node, clock)

    await player.stop()

    expect(calls[0].method).toBe('schedule')
    expect(calls[0].args[0]).toMatchObject({ active: false })
  })

  it('getCurrentTime interpolates from the last reported input time while playing', async () => {
    const { node } = fakeNode()
    const player = new StretchPlayer(node, clock)
    await player.start(5, 0)

    player.handleTimeUpdate(5.2, 20)
    clock.currentTime = 20.3

    expect(player.getCurrentTime()).toBeCloseTo(5.5, 5)
  })

  it('getCurrentTime stays fixed after stop', async () => {
    const { node } = fakeNode()
    const player = new StretchPlayer(node, clock)
    await player.start(5, 0)
    player.handleTimeUpdate(6, 30)
    clock.currentTime = 30.5
    await player.stop()
    clock.currentTime = 31

    expect(player.getCurrentTime()).toBeCloseTo(6.5, 5)
  })
})
