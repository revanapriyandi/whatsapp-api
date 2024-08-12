import { Rabbitmq } from '@prisma/client';

import { Logger } from '../../../../config/logger.config';
import { InstanceDto } from '../../../dto/instance.dto';
import { WAMonitoringService } from '../../../services/monitor.service';
import { RabbitmqDto } from '../dto/rabbitmq.dto';
import { initQueues } from '../libs/amqp.server';

export class RabbitmqService {
  constructor(private readonly waMonitor: WAMonitoringService) {}

  private readonly logger = new Logger(RabbitmqService.name);

  public create(instance: InstanceDto, data: RabbitmqDto) {
    this.waMonitor.waInstances[instance.instanceName].setRabbitmq(data);

    initQueues(instance.instanceName, data.events);
    return { rabbitmq: { ...instance, rabbitmq: data } };
  }

  public async find(instance: InstanceDto): Promise<Rabbitmq> {
    try {
      const result = await this.waMonitor.waInstances[instance.instanceName].findRabbitmq();

      if (Object.keys(result).length === 0) {
        throw new Error('Rabbitmq not found');
      }

      return result;
    } catch (error) {
      return null;
    }
  }
}
