import { Tags } from 'aws-cdk-lib';
import { SSTConfig } from 'sst';
import { ApiStack } from './stacks/ApiStack';
import { DataStack } from './stacks/DataStack';
import { ProcessorStack } from './stacks/ProcessorStack';

export default {
  config(_input) {
    return {
      name: 'dealer',
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
    app.stack(ProcessorStack);
    app.stack(ApiStack);

    // tags let us discover all the aws resource costs incurred by this app
    // see: https://docs.sst.dev/advanced/tagging-resources
    Tags.of(app).add('Project', 'dealer')
    Tags.of(app).add('Repository', 'https://github.com/web3-storage/dealer')
    Tags.of(app).add('Environment', `${app.stage}`)
    Tags.of(app).add('ManagedBy', 'SST')
  }
} satisfies SSTConfig;
