import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as ecs from '@aws-cdk/aws-ecs';
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2';
import * as path from 'path';

export class AutoscalingDemoStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'VPC', {
      maxAzs: 2,
    });

    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc
    });

    const image = new ecs.AssetImage(path.join(__dirname, 'app'));

    const taskDefinition = new ecs.TaskDefinition(this, 'TaskDefinition', {
      compatibility: ecs.Compatibility.EC2_AND_FARGATE,
      cpu: "1024",
      memoryMiB: "2048",
    });
    taskDefinition.addContainer('app', {
      image,
      cpu: 1024,
      memoryReservationMiB: 256,
      portMappings: [{
        containerPort: 80,
        hostPort: 80
      }],
    });

    const service = new ecs.FargateService(this, 'Service', {
      cluster,
      taskDefinition,
    });
    const scaling = service.autoScaleTaskCount({
      maxCapacity: 100
    });
    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 80
    });

    const lb = new elbv2.ApplicationLoadBalancer(this, 'LoadBalancer', {
      vpc,
      internetFacing: true,
    });
    const targetGroup = new elbv2.ApplicationTargetGroup(this, 'TargetGroup', {
      vpc,
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      deregistrationDelay: cdk.Duration.seconds(30),
      targets: [service],
    });
    lb.addListener('app', {
      protocol: elbv2.ApplicationProtocol.HTTP,
      defaultTargetGroups: [targetGroup]
    });

    new cdk.CfnOutput(this, 'LoadBalancerEndpoint', {
      description: 'Load Balancer Endpoint',
      value: lb.loadBalancerDnsName,
    });
  }
}
