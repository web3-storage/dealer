import { Tags } from 'aws-cdk-lib';
import { SSTConfig } from 'sst';
import { ApiStack } from './stacks/ApiStack';
import { CronStack } from './stacks/CronStack';
import { DataStack } from './stacks/DataStack';

export default {
  config(_input) {
    return {
      name: 'spade-proxy',
      region: 'us-west-2',
    };
  },
  stacks(app) {
    app.setDefaultFunctionProps({
      runtime: 'nodejs18.x',
      environment: {
        NODE_OPTIONS: "--enable-source-maps",
      },
      nodejs: {
        format: 'esm',
        sourcemap: true
      }
    })
    app.stack(DataStack);
    app.stack(ApiStack);
    app.stack(CronStack);

    // tags let us discover all the aws resource costs incurred by this app
    // see: https://docs.sst.dev/advanced/tagging-resources
    Tags.of(app).add('Project', 'spade-proxy')
    Tags.of(app).add('Repository', 'https://github.com/web3-storage/spade-proxy')
    Tags.of(app).add('Environment', `${app.stage}`)
    Tags.of(app).add('ManagedBy', 'SST')
  }
} satisfies SSTConfig;
