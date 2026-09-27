import { runLiveProbe } from './jev-category-live-probe.js'

try {
  const result = await runLiveProbe()
  console.log(JSON.stringify(result))
} catch (error) {
  if (error?.code === 'jev_live_probe_not_approved') {
    console.error('Refusing live JEV probe: explicit approval is required.')
  } else if (error?.code === 'jev_live_probe_configuration_invalid') {
    console.error('Refusing live JEV probe: required provider configuration is incomplete or invalid.')
  } else {
    console.error('Live JEV probe failed; provider details are suppressed.')
  }
  process.exitCode = 1
}
